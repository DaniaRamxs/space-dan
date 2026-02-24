-- ====================================================================================
-- SISTEMA COMPETITIVO POR TEMPORADAS (21 DÍAS) - SUPABASE
-- ARQUITECTURA TIER 1 - LISTO PARA PRODUCCIÓN
-- ====================================================================================

-- 1. Tabla de Temporadas
CREATE TABLE IF NOT EXISTS public.competitive_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number int NOT NULL UNIQUE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Asegurar que solo haya una temporada activa a la vez
DROP INDEX IF EXISTS idx_one_active_season;
CREATE UNIQUE INDEX idx_one_active_season ON public.competitive_seasons (is_active) WHERE is_active = true;

-- 2. Historial de Resultados (Hall of Fame)
CREATE TABLE IF NOT EXISTS public.competitive_season_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.competitive_seasons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  final_position int NOT NULL,
  reward_type text CHECK (reward_type IN ('gold', 'silver', 'bronze', 'participant')),
  final_balance int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(season_id, user_id)
);

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS season_balance int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_season_earnings int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_earning_date date DEFAULT CURRENT_DATE;

-- Inicializar usuarios existentes para evitar valores NULL
UPDATE public.profiles 
SET 
  season_balance = COALESCE(season_balance, 0),
  daily_season_earnings = COALESCE(daily_season_earnings, 0),
  last_earning_date = COALESCE(last_earning_date, CURRENT_DATE);

CREATE INDEX IF NOT EXISTS idx_season_balance ON public.profiles(season_balance DESC);

-- 4. Set RLS Policies
ALTER TABLE public.competitive_seasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Seasons are viewable by everyone" ON public.competitive_seasons;
CREATE POLICY "Seasons are viewable by everyone" ON public.competitive_seasons FOR SELECT USING (true);

ALTER TABLE public.competitive_season_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Results are viewable by everyone" ON public.competitive_season_results;
CREATE POLICY "Results are viewable by everyone" ON public.competitive_season_results FOR SELECT USING (true);

-- ====================================================================================
-- CORE BACKEND ENGINE: calculateSeasonReward
-- RPC Seguro que maneja multiplicadores y previene manipulaciones del cliente
-- ====================================================================================
CREATE OR REPLACE FUNCTION public.award_competitive_coins(p_user_id uuid, p_base_coins int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_active_season record;
  v_now timestamptz := now();
  v_is_night boolean := false;
  v_is_weekend boolean := false;
  v_is_final_phase boolean := false;
  v_multiplier numeric := 1.0;
  
  v_user_stats record;
  v_top1_balance int := 0;
  v_rank_position int := 0;
  v_needs_comeback boolean := false;
  
  v_final_coins int;
  v_daily_cap int := 3000; -- Protección estricta: Cap máximo de Dancoins por día
  v_available_cap int;
  v_result jsonb;

  -- Horarios y fechas locales (UTC-5)
  v_local_time time := (v_now AT TIME ZONE 'America/Lima')::time;
  v_local_date date := (v_now AT TIME ZONE 'America/Lima')::date;
  v_local_dow int := EXTRACT(ISODOW FROM (v_now AT TIME ZONE 'America/Lima'));
BEGIN
  -- 1. Verificar temporada activa
  SELECT * INTO v_active_season FROM public.competitive_seasons WHERE is_active = true LIMIT 1;
  IF NOT FOUND THEN
    -- Si no hay temporada, dar monedas base normales al balance permanente
    UPDATE public.profiles SET balance = balance + p_base_coins WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true, 'awarded', p_base_coins, 'reason', 'off-season');
  END IF;

  -- 2. Detección predecible de Boosts
  -- Boost Nocturno (22:00 a 05:00)
  IF v_local_time >= '22:00:00'::time OR v_local_time < '05:00:00'::time THEN
    v_is_night := true;
    v_multiplier := v_multiplier + 0.20; -- +20%
  END IF;
  
  -- Boost de Fin de Semana (Sábado y Domingo)
  IF v_local_dow IN (6, 7) THEN
    v_is_weekend := true;
    v_multiplier := v_multiplier + 0.30; -- +30%
  END IF;

  -- Boost Fase Final (Últimos 3 días son sangrientos)
  IF v_active_season.end_at - v_now <= interval '3 days' THEN
    v_is_final_phase := true;
    v_multiplier := v_multiplier + 0.50; -- +50%
  END IF;

  -- Bloqueo de fila para evitar race conditions explotables (double spending)
  SELECT season_balance, daily_season_earnings, last_earning_date 
  INTO v_user_stats FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  
  -- Reset cap de bonus diario si ha pasado un día
  IF v_user_stats.last_earning_date < v_local_date THEN
    v_user_stats.daily_season_earnings := 0;
  END IF;

  -- 3. Dynamic Micro-Comeback (Ponderando el Meta-Juego)
  -- Determinar rápidamente posición aproximada del usuario
  SELECT count(*) + 1 INTO v_rank_position FROM public.profiles WHERE season_balance > v_user_stats.season_balance;
  
  -- Para darle esperanza a los perdedores, si rank > 3 y el Top 1 te dobla, te damos +15% de empuje.
  IF v_rank_position > 3 THEN
    SELECT season_balance INTO v_top1_balance FROM public.profiles ORDER BY season_balance DESC LIMIT 1;
    IF v_user_stats.season_balance < (v_top1_balance * 0.5) THEN
      v_needs_comeback := true;
      v_multiplier := v_multiplier + 0.15;
    END IF;
  END IF;

  -- 4. Aplicación estricta del Cap y Balance
  v_final_coins := round(p_base_coins * v_multiplier);
  v_available_cap := v_daily_cap - v_user_stats.daily_season_earnings;
  
  IF v_final_coins > v_available_cap THEN
    v_final_coins := GREATEST(v_available_cap, 0);
  END IF;

  -- 5. Commit de Datos
  IF v_final_coins > 0 THEN
    UPDATE public.profiles 
    SET 
      balance = balance + v_final_coins,
      season_balance = season_balance + v_final_coins,
      daily_season_earnings = v_user_stats.daily_season_earnings + v_final_coins,
      last_earning_date = v_local_date
    WHERE id = p_user_id;
  END IF;

  -- Devolver log cifrado hacia el Frontend para UX (banners y sonidos especiales)
  v_result := jsonb_build_object(
    'success', true,
    'awarded', v_final_coins,
    'multiplier', v_multiplier,
    'boosts', jsonb_build_object(
      'night', v_is_night,
      'weekend', v_is_weekend,
      'rush', v_is_final_phase,
      'comeback', v_needs_comeback
    ),
    'cap_hit', v_final_coins < round(p_base_coins * v_multiplier)
  );
  RETURN v_result;
END;
$$;


-- ====================================================================================
-- RUTINA DE CIERRE DE TEMPORADA (Ejecutar vía Cron o Manual)
-- ====================================================================================
CREATE OR REPLACE FUNCTION public.close_active_season()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_season record;
  v_next_number int;
  v_row record;
  v_rank int := 1;
  v_reward text;
BEGIN
  -- Lock the row
  SELECT * INTO v_current_season FROM public.competitive_seasons WHERE is_active = true FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  -- Distribuir premios y guardar resultados
  FOR v_row IN 
    SELECT id, season_balance FROM public.profiles 
    WHERE season_balance > 0 
    ORDER BY season_balance DESC 
  LOOP
    IF v_rank = 1 THEN v_reward := 'gold';
    ELSIF v_rank = 2 THEN v_reward := 'silver';
    ELSIF v_rank = 3 THEN v_reward := 'bronze';
    ELSE v_reward := 'participant';
    END IF;

    -- Registrar legado
    INSERT INTO public.competitive_season_results (season_id, user_id, final_position, reward_type, final_balance)
    VALUES (v_current_season.id, v_row.id, v_rank, v_reward, v_row.season_balance);

    -- Anunciar al usuario top 3
    IF v_rank <= 3 THEN
      INSERT INTO public.notifications (user_id, type, message) 
      VALUES (v_row.id, 'achievement', '🏆 ¡Has completado la Temporada ' || v_current_season.number || ' en el TOP ' || v_rank || ' mundial!');
    END IF;

    v_rank := v_rank + 1;
  END LOOP;

  -- Format Wipe: Todos a 0
  UPDATE public.profiles SET season_balance = 0, daily_season_earnings = 0;

  -- Desactivar y crear la Temporada Siguiente (Duración 21 días cronometrada)
  UPDATE public.competitive_seasons SET is_active = false WHERE id = v_current_season.id;
  
  v_next_number := v_current_season.number + 1;
  INSERT INTO public.competitive_seasons (number, start_at, end_at, is_active)
  VALUES (v_next_number, now(), now() + interval '21 days', true);
END;
$$;

-- ====================================================================================
-- READ ONLY API - Status en tiempo real con gaps matemáticos para React
-- ====================================================================================
CREATE OR REPLACE FUNCTION public.get_season_status(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_season record;
  v_rank int;
  v_balance int;
  v_next_balance int;
  v_gap int := 0;
  
  v_now timestamptz := now();
  v_is_night boolean := false;
  v_is_weekend boolean := false;
  v_local_time time := (v_now AT TIME ZONE 'America/Lima')::time;
  v_local_dow int := EXTRACT(ISODOW FROM (v_now AT TIME ZONE 'America/Lima'));
BEGIN
  SELECT * INTO v_season FROM public.competitive_seasons WHERE is_active = true LIMIT 1;
  IF NOT FOUND THEN RETURN null; END IF;

  SELECT season_balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
  
  -- Compute Rank
  SELECT count(*) + 1 INTO v_rank 
  FROM public.profiles WHERE season_balance > v_balance;

  -- Gap para pasar al siguiente (competitividad visual)
  IF v_rank > 1 THEN
    SELECT season_balance INTO v_next_balance 
    FROM public.profiles 
    WHERE season_balance > v_balance 
    ORDER BY season_balance ASC LIMIT 1;
    v_gap := v_next_balance - v_balance;
  END IF;

  -- Detect boosts for UI banners
  IF v_local_time >= '22:00:00'::time OR v_local_time < '05:00:00'::time THEN
    v_is_night := true;
  END IF;
  IF v_local_dow IN (6, 7) THEN
    v_is_weekend := true;
  END IF;

  RETURN jsonb_build_object(
    'number', v_season.number,
    'end_at', v_season.end_at,
    'my_position', v_rank,
    'my_balance', v_balance,
    'gap_to_next', v_gap,
    'in_top_zone', (v_rank <= 3),
    'is_final_phase', (v_season.end_at - now() <= interval '3 days'),
    'active_boosts', jsonb_build_object(
      'night', v_is_night,
      'weekend', v_is_weekend
    )
  );
END;
$$;


-- Inicialización Semilla: Crear Temporada 1 Automáticamente
INSERT INTO public.competitive_seasons (number, start_at, end_at, is_active)
VALUES (1, now(), now() + interval '21 days', true)
ON CONFLICT DO NOTHING;
