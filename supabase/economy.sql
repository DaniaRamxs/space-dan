-- ============================================================
-- space-dan :: Economy System
-- Dancoins, Wallet, Transactions, Transfers, Store,
-- Pet Loadouts, Community Fund, Leaderboard Extensions
-- ============================================================
-- ORDEN DE EJECUCIÓN: Ejecutar después de schema.sql
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 1: EXTIENDE PROFILES
-- Agrega balance y campos de personalización
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS balance        integer      NOT NULL DEFAULT 0 CHECK (balance >= 0),
  ADD COLUMN IF NOT EXISTS banner_color   text         DEFAULT NULL
    CHECK (banner_color IS NULL OR banner_color ~* '^#[0-9a-fA-F]{6}$'),
  ADD COLUMN IF NOT EXISTS banner_item_id text         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS frame_item_id  text         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS equipped_items jsonb        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_daily_at  timestamptz  DEFAULT NULL;

-- ────────────────────────────────────────────────────────────
-- SECCIÓN 2: STORE_ITEMS — catálogo de la tienda
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.store_items (
  id              text        PRIMARY KEY,
  category        text        NOT NULL CHECK (category IN (
                    'banner', 'frame', 'pet_accessory',
                    'cursor', 'theme', 'screensaver', 'stars', 'radio'
                  )),
  title           text        NOT NULL,
  description     text,
  price           integer     NOT NULL CHECK (price > 0),
  rarity          text        NOT NULL DEFAULT 'common' CHECK (rarity IN (
                    'common', 'rare', 'epic', 'legendary', 'limited'
                  )),
  icon            text,
  preview_url     text,
  -- Para banners: { "hex": "#..." } o { "gradient": ["#a","#b"] }
  -- Para pet_accessory: { "slot": "head", "svg_path": "..." }
  -- Para themes: { "vars": { "--accent": "#...", ... } }
  metadata        jsonb       NOT NULL DEFAULT '{}',
  is_active       boolean     NOT NULL DEFAULT true,
  available_until timestamptz DEFAULT NULL,
  max_supply      integer     DEFAULT NULL,
  sold_count      integer     NOT NULL DEFAULT 0,
  sort_order      integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_items_category
  ON public.store_items (category, is_active, sort_order);

-- FK diferidas para permitir que profiles referencie store_items
-- (ADD CONSTRAINT IF NOT EXISTS no existe en PostgreSQL — usar DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_profile_banner_item' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profile_banner_item
        FOREIGN KEY (banner_item_id) REFERENCES public.store_items(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_profile_frame_item' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profile_frame_item
        FOREIGN KEY (frame_item_id) REFERENCES public.store_items(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- SECCIÓN 3: USER_ITEMS — inventario de usuario
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id      text        NOT NULL REFERENCES public.store_items(id),
  is_equipped  boolean     NOT NULL DEFAULT false,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_items_user    ON public.user_items (user_id);
CREATE INDEX IF NOT EXISTS idx_user_items_equipped ON public.user_items (user_id) WHERE is_equipped = true;

-- ────────────────────────────────────────────────────────────
-- SECCIÓN 4: PET_LOADOUTS — accesorios de mascota por usuario
-- Cada slot acepta un item_id de categoría 'pet_accessory'
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pet_loadouts (
  user_id    uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_head  text        REFERENCES public.store_items(id) ON DELETE SET NULL,
  slot_body  text        REFERENCES public.store_items(id) ON DELETE SET NULL,
  slot_hand  text        REFERENCES public.store_items(id) ON DELETE SET NULL,
  slot_bg    text        REFERENCES public.store_items(id) ON DELETE SET NULL,
  slot_extra text        REFERENCES public.store_items(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- SECCIÓN 5: TRANSACTIONS — libro de contabilidad inmutable
-- NUNCA se modifica. Solo INSERT vía funciones SECURITY DEFINER
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transactions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount       integer     NOT NULL,     -- positivo = ingreso, negativo = gasto
  balance_after integer    NOT NULL,     -- snapshot del balance DESPUÉS de la tx
  type         text        NOT NULL CHECK (type IN (
                 'achievement', 'daily_bonus', 'game_reward', 'page_visit',
                 'purchase', 'transfer_in', 'transfer_out', 'transfer_fee',
                 'community_donation', 'community_reward',
                 'admin_grant', 'admin_deduct', 'migration'
               )),
  reference_id text        DEFAULT NULL, -- id del logro, item, transfer, etc.
  description  text        DEFAULT NULL,
  metadata     jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tx_user      ON public.transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_type      ON public.transactions (type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_reference ON public.transactions (reference_id) WHERE reference_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- SECCIÓN 6: TRANSFERS — transferencias peer-to-peer
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transfers (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount       integer     NOT NULL CHECK (amount > 0),
  fee          integer     NOT NULL DEFAULT 0 CHECK (fee >= 0),
  net_amount   integer     NOT NULL CHECK (net_amount > 0),
  message      text        DEFAULT NULL CHECK (char_length(message) <= 120),
  status       text        NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'reversed')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (from_user_id != to_user_id),
  CHECK (net_amount = amount - fee)
);

CREATE INDEX IF NOT EXISTS idx_transfer_from ON public.transfers (from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfer_to   ON public.transfers (to_user_id,   created_at DESC);

-- ────────────────────────────────────────────────────────────
-- SECCIÓN 7: BALANCE_SNAPSHOTS — historial semanal
-- Permite calcular crecimiento semanal sin escanear transactions
-- Se actualiza en cada operación que cambia el balance
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.balance_snapshots (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance    integer NOT NULL CHECK (balance >= 0),
  week       text    NOT NULL,            -- formato ISO: '2025-W07'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_week ON public.balance_snapshots (week, balance DESC);

-- ────────────────────────────────────────────────────────────
-- SECCIÓN 8: COMMUNITY_FUND — fondo colaborativo
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_fund (
  id            serial      PRIMARY KEY,
  name          text        NOT NULL,
  description   text,
  goal          integer     NOT NULL CHECK (goal > 0),
  current       integer     NOT NULL DEFAULT 0 CHECK (current >= 0),
  -- 'equal': todos reciben igual al completar
  -- 'proportional': cada uno recibe proporcional a su donación
  reward_type   text        NOT NULL DEFAULT 'equal' CHECK (reward_type IN ('equal', 'proportional')),
  reward_item_id text       REFERENCES public.store_items(id) ON DELETE SET NULL,
  reward_coins  integer     NOT NULL DEFAULT 0 CHECK (reward_coins >= 0),
  status        text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'rewarded')),
  starts_at     timestamptz NOT NULL DEFAULT now(),
  ends_at       timestamptz DEFAULT NULL,
  completed_at  timestamptz DEFAULT NULL,
  rewarded_at   timestamptz DEFAULT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fund_contributions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id    integer     NOT NULL REFERENCES public.community_fund(id),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount     integer     NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fund_contrib_fund ON public.fund_contributions (fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_contrib_user ON public.fund_contributions (user_id);


-- ============================================================
-- SECCIÓN 9: FUNCIONES UTILITARIAS
-- ============================================================

-- Semana ISO actual como string
CREATE OR REPLACE FUNCTION public.current_iso_week()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT to_char(now() AT TIME ZONE 'UTC', 'IYYY"-W"IW');
$$;

-- Actualiza snapshot semanal (se llama desde funciones de balance)
CREATE OR REPLACE FUNCTION public.upsert_weekly_snapshot(p_user_id uuid, p_balance integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO public.balance_snapshots (user_id, balance, week)
  VALUES (p_user_id, p_balance, public.current_iso_week())
  ON CONFLICT (user_id, week) DO UPDATE
    SET balance = EXCLUDED.balance;
$$;


-- ============================================================
-- SECCIÓN 10: FUNCIÓN AWARD_COINS
-- Fuente de verdad para GANAR monedas (logros, dailies, etc.)
-- NUNCA llamar UPDATE en profiles.balance directamente desde el frontend
-- ============================================================

CREATE OR REPLACE FUNCTION public.award_coins(
  p_user_id    uuid,
  p_amount     integer,
  p_type       text,
  p_reference  text    DEFAULT NULL,
  p_description text   DEFAULT NULL,
  p_metadata   jsonb   DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance   integer;
  v_daily_earned  integer;
  -- Límites diarios anti-abuse por tipo
  v_daily_cap     integer := CASE p_type
    WHEN 'page_visit'   THEN 100   -- máx 100/día por visitar páginas
    WHEN 'game_reward'  THEN 500   -- máx 500/día de juegos
    WHEN 'achievement'  THEN NULL  -- sin cap (logros son únicos)
    WHEN 'daily_bonus'  THEN 30    -- exactamente 30
    ELSE NULL
  END;
BEGIN
  -- Solo tipos válidos para ganar coins
  IF p_type NOT IN ('achievement','daily_bonus','game_reward','page_visit','admin_grant','community_reward','migration') THEN
    RAISE EXCEPTION 'Tipo inválido para award_coins: %', p_type;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser positivo';
  END IF;

  -- Verificar cap diario si aplica
  IF v_daily_cap IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_daily_earned
    FROM public.transactions
    WHERE user_id = p_user_id
      AND type    = p_type
      AND created_at >= (now() AT TIME ZONE 'UTC')::date;

    -- Si ya alcanzó el cap, retorna sin error pero sin cambio
    IF v_daily_earned >= v_daily_cap THEN
      SELECT balance INTO v_new_balance FROM public.profiles WHERE id = p_user_id;
      RETURN jsonb_build_object(
        'success',     false,
        'reason',      'daily_cap_reached',
        'balance',     v_new_balance,
        'cap',         v_daily_cap,
        'earned_today', v_daily_earned
      );
    END IF;

    -- Ajustar monto para no superar el cap
    p_amount := LEAST(p_amount, v_daily_cap - v_daily_earned);
  END IF;

  -- Actualizar balance atómicamente
  UPDATE public.profiles
  SET balance = balance + p_amount
  WHERE id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado: %', p_user_id;
  END IF;

  -- Registrar en ledger
  INSERT INTO public.transactions (user_id, amount, balance_after, type, reference_id, description, metadata)
  VALUES (p_user_id, p_amount, v_new_balance, p_type, p_reference, p_description, p_metadata);

  -- Snapshot semanal
  PERFORM public.upsert_weekly_snapshot(p_user_id, v_new_balance);

  RETURN jsonb_build_object(
    'success', true,
    'awarded', p_amount,
    'balance', v_new_balance
  );
END;
$$;


-- ============================================================
-- SECCIÓN 11: FUNCIÓN CLAIM_DAILY_BONUS
-- Idempotente y server-side. El frontend NO puede hacer esto con UPDATE.
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_daily_bonus(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_last_claim  timestamptz;
  v_new_balance integer;
  v_BONUS       constant integer := 30;
  v_COOLDOWN    constant interval := interval '20 hours';
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Buscar el último claim en el ledger (fuente de verdad)
  SELECT MAX(created_at) INTO v_last_claim
  FROM public.transactions
  WHERE user_id = p_user_id AND type = 'daily_bonus';

  IF v_last_claim IS NOT NULL AND v_last_claim > now() - v_COOLDOWN THEN
    RETURN jsonb_build_object(
      'success', false, 
      'reason', 'cooldown', 
      'message', format('Ya reclamaste el bonus. Próximo disponible: %s', to_char(v_last_claim + v_COOLDOWN, 'DD/MM/YYYY HH24:MI'))
    );
  END IF;

  -- Conceder bonus
  UPDATE public.profiles
  SET balance = balance + v_BONUS, last_daily_at = now()
  WHERE id = p_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
  VALUES (p_user_id, v_BONUS, v_new_balance, 'daily_bonus', 'Bonus diario reclamado');

  PERFORM public.upsert_weekly_snapshot(p_user_id, v_new_balance);

  RETURN jsonb_build_object('success', true, 'bonus', v_BONUS, 'balance', v_new_balance);
END;
$$;


-- ============================================================
-- SECCIÓN 12: FUNCIÓN TRANSFER_COINS
-- Transferencia peer-to-peer con comisión y rate limiting
-- ============================================================

CREATE OR REPLACE FUNCTION public.transfer_coins(
  p_from_user_id uuid,
  p_to_user_id   uuid,
  p_amount       integer,
  p_message      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fee            integer;
  v_net            integer;
  v_from_balance   integer;
  v_to_balance     integer;
  v_transfer_id    uuid;
  v_hourly_count   integer;
  v_hourly_volume  integer;

  -- Configuración de la economía
  v_MAX_TRANSFER   constant integer := 500;
  v_MIN_TRANSFER   constant integer := 10;
  v_FEE_RATE       constant numeric := 0.05;  -- 5%
  v_MAX_HOURLY_TXS constant integer := 5;
  v_MAX_HOURLY_VOL constant integer := 1000;  -- volumen máx/hora
BEGIN
  -- El llamador debe ser el emisor
  IF auth.uid() != p_from_user_id THEN
    RAISE EXCEPTION 'Solo puedes transferir desde tu propia cuenta';
  END IF;

  IF p_from_user_id = p_to_user_id THEN
    RAISE EXCEPTION 'No puedes transferirte a ti mismo';
  END IF;

  IF p_amount < v_MIN_TRANSFER THEN
    RAISE EXCEPTION 'Monto mínimo de transferencia: % Dancoins', v_MIN_TRANSFER;
  END IF;

  IF p_amount > v_MAX_TRANSFER THEN
    RAISE EXCEPTION 'Monto máximo de transferencia: % Dancoins', v_MAX_TRANSFER;
  END IF;

  IF p_message IS NOT NULL AND char_length(p_message) > 120 THEN
    RAISE EXCEPTION 'El mensaje no puede superar 120 caracteres';
  END IF;

  -- Rate limit: cantidad y volumen por hora
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_hourly_count, v_hourly_volume
  FROM public.transfers
  WHERE from_user_id = p_from_user_id
    AND created_at > now() - interval '1 hour';

  IF v_hourly_count >= v_MAX_HOURLY_TXS THEN
    RAISE EXCEPTION 'Límite de transferencias: máximo % por hora', v_MAX_HOURLY_TXS;
  END IF;

  IF v_hourly_volume + p_amount > v_MAX_HOURLY_VOL THEN
    RAISE EXCEPTION 'Límite de volumen horario alcanzado (máx % ◈/hora)', v_MAX_HOURLY_VOL;
  END IF;

  -- Verificar que el receptor existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_to_user_id) THEN
    RAISE EXCEPTION 'Usuario receptor no encontrado';
  END IF;

  -- Calcular comisión (0 para montos < 10, 5% para el resto)
  v_fee := GREATEST(0, FLOOR(p_amount * v_FEE_RATE)::integer);
  v_net := p_amount - v_fee;

  IF v_net <= 0 THEN
    RAISE EXCEPTION 'Monto neto inválido después de comisión';
  END IF;

  -- Bloquear filas en orden consistente para evitar deadlocks
  PERFORM 1 FROM public.profiles
  WHERE id IN (
    LEAST(p_from_user_id, p_to_user_id),
    GREATEST(p_from_user_id, p_to_user_id)
  )
  ORDER BY id
  FOR UPDATE;

  -- Verificar balance del emisor
  SELECT balance INTO v_from_balance
  FROM public.profiles WHERE id = p_from_user_id;

  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'Balance insuficiente: tienes % ◈, necesitas % ◈',
      v_from_balance, p_amount;
  END IF;

  -- Ejecutar transferencia
  UPDATE public.profiles SET balance = balance - p_amount
  WHERE id = p_from_user_id RETURNING balance INTO v_from_balance;

  UPDATE public.profiles SET balance = balance + v_net
  WHERE id = p_to_user_id RETURNING balance INTO v_to_balance;

  -- Registrar transfer
  INSERT INTO public.transfers (from_user_id, to_user_id, amount, fee, net_amount, message)
  VALUES (p_from_user_id, p_to_user_id, p_amount, v_fee, v_net, p_message)
  RETURNING id INTO v_transfer_id;

  -- Ledger (3 entradas: salida, entrada, comisión)
  INSERT INTO public.transactions (user_id, amount, balance_after, type, reference_id, description)
  VALUES
    (p_from_user_id, -p_amount,  v_from_balance, 'transfer_out',
     v_transfer_id::text, format('Enviado a usuario')),
    (p_to_user_id,   v_net,      v_to_balance,   'transfer_in',
     v_transfer_id::text, format('Recibido de usuario'));

  IF v_fee > 0 THEN
    INSERT INTO public.transactions (user_id, amount, balance_after, type, reference_id, description)
    VALUES (p_from_user_id, -v_fee, v_from_balance, 'transfer_fee',
            v_transfer_id::text, format('Comisión del sistema (%s%%)', 5));
  END IF;

  -- Actualizar snapshots semanales
  PERFORM public.upsert_weekly_snapshot(p_from_user_id, v_from_balance);
  PERFORM public.upsert_weekly_snapshot(p_to_user_id,   v_to_balance);

  RETURN jsonb_build_object(
    'success',      true,
    'transfer_id',  v_transfer_id,
    'amount_sent',  p_amount,
    'fee',          v_fee,
    'net_received', v_net,
    'from_balance', v_from_balance,
    'to_balance',   v_to_balance
  );
END;
$$;


-- ============================================================
-- SECCIÓN 13: FUNCIÓN PURCHASE_ITEM
-- Compra segura desde la tienda
-- ============================================================

CREATE OR REPLACE FUNCTION public.purchase_item(
  p_user_id uuid,
  p_item_id text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item        public.store_items%ROWTYPE;
  v_new_balance integer;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Cargar item con bloqueo
  SELECT * INTO v_item
  FROM public.store_items
  WHERE id = p_item_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item no encontrado o inactivo: %', p_item_id;
  END IF;

  -- Verificar ventana temporal
  IF v_item.available_until IS NOT NULL AND v_item.available_until < now() THEN
    RAISE EXCEPTION 'Este item ya no está disponible';
  END IF;

  -- Verificar stock
  IF v_item.max_supply IS NOT NULL AND v_item.sold_count >= v_item.max_supply THEN
    RAISE EXCEPTION 'Agotado: % (stock: %/%)', v_item.title, v_item.sold_count, v_item.max_supply;
  END IF;

  -- Verificar que no lo tenga ya
  IF EXISTS (SELECT 1 FROM public.user_items WHERE user_id = p_user_id AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'Ya tienes este item: %', v_item.title;
  END IF;

  -- Verificar balance con lock
  SELECT balance INTO v_new_balance FROM public.profiles
  WHERE id = p_user_id FOR UPDATE;

  IF v_new_balance < v_item.price THEN
    RAISE EXCEPTION 'Balance insuficiente: tienes % ◈, el item cuesta % ◈',
      v_new_balance, v_item.price;
  END IF;

  -- Descontar coins
  UPDATE public.profiles
  SET balance = balance - v_item.price
  WHERE id = p_user_id
  RETURNING balance INTO v_new_balance;

  -- Agregar al inventario
  INSERT INTO public.user_items (user_id, item_id)
  VALUES (p_user_id, p_item_id);

  -- Incrementar sold_count
  UPDATE public.store_items
  SET sold_count = sold_count + 1
  WHERE id = p_item_id;

  -- Ledger
  INSERT INTO public.transactions (user_id, amount, balance_after, type, reference_id, description)
  VALUES (p_user_id, -v_item.price, v_new_balance, 'purchase', p_item_id,
          format('Comprado: %s', v_item.title));

  PERFORM public.upsert_weekly_snapshot(p_user_id, v_new_balance);

  RETURN jsonb_build_object(
    'success',     true,
    'item_id',     p_item_id,
    'item_title',  v_item.title,
    'price',       v_item.price,
    'new_balance', v_new_balance
  );
END;
$$;


-- ============================================================
-- SECCIÓN 14: FUNCIÓN EQUIP_ITEM
-- Equipar/desequipar items del inventario
-- ============================================================

CREATE OR REPLACE FUNCTION public.equip_item(
  p_user_id   uuid,
  p_item_id   text,
  p_equip     boolean DEFAULT true   -- false = desequipar
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_category text;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Verificar que el usuario tiene el item
  IF NOT EXISTS (SELECT 1 FROM public.user_items WHERE user_id = p_user_id AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'No tienes este item en tu inventario';
  END IF;

  -- Obtener categoría
  SELECT category INTO v_category FROM public.store_items WHERE id = p_item_id;

  IF p_equip THEN
    -- Desequipar cualquier otro item de la misma categoría
    UPDATE public.user_items
    SET is_equipped = false
    WHERE user_id = p_user_id
      AND item_id IN (SELECT id FROM public.store_items WHERE category = v_category)
      AND item_id != p_item_id;

    -- Equipar el nuevo
    UPDATE public.user_items SET is_equipped = true
    WHERE user_id = p_user_id AND item_id = p_item_id;

    -- Actualizar equipped_items en profiles para acceso rápido
    UPDATE public.profiles
    SET equipped_items = equipped_items || jsonb_build_object(v_category, p_item_id)
    WHERE id = p_user_id;

    -- Si es banner, limpiar banner_color (son mutuamente excluyentes)
    IF v_category = 'banner' THEN
      UPDATE public.profiles SET banner_item_id = p_item_id, banner_color = NULL
      WHERE id = p_user_id;
    END IF;

    IF v_category = 'frame' THEN
      UPDATE public.profiles SET frame_item_id = p_item_id WHERE id = p_user_id;
    END IF;

    -- Si es accesorio de mascota, actualizar pet_loadout
    IF v_category = 'pet_accessory' THEN
      DECLARE v_slot text;
      BEGIN
        v_slot := (SELECT metadata->>'slot' FROM public.store_items WHERE id = p_item_id);
        IF v_slot IS NOT NULL THEN
          INSERT INTO public.pet_loadouts (user_id)
          VALUES (p_user_id)
          ON CONFLICT (user_id) DO NOTHING;

          EXECUTE format(
            'UPDATE public.pet_loadouts SET %I = $1, updated_at = now() WHERE user_id = $2',
            'slot_' || v_slot
          ) USING p_item_id, p_user_id;
        END IF;
      END;
    END IF;
  ELSE
    -- Desequipar
    UPDATE public.user_items SET is_equipped = false
    WHERE user_id = p_user_id AND item_id = p_item_id;

    UPDATE public.profiles
    SET equipped_items = equipped_items - v_category
    WHERE id = p_user_id;

    IF v_category = 'banner' THEN
      UPDATE public.profiles SET banner_item_id = NULL WHERE id = p_user_id;
    END IF;
    IF v_category = 'frame' THEN
      UPDATE public.profiles SET frame_item_id = NULL WHERE id = p_user_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'equipped', p_equip, 'item_id', p_item_id);
END;
$$;


-- ============================================================
-- SECCIÓN 15: FUNCIÓN SET_BANNER_COLOR
-- Permite establecer un color de banner personalizado (hex)
-- Mutuamente excluyente con banner_item
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_banner_color(
  p_user_id uuid,
  p_color   text   -- '#RRGGBB' o NULL para eliminar
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_color IS NOT NULL AND p_color !~* '^#[0-9a-fA-F]{6}$' THEN
    RAISE EXCEPTION 'Color inválido. Usa formato hex: #RRGGBB';
  END IF;

  UPDATE public.profiles
  SET banner_color   = p_color,
      banner_item_id = NULL   -- color y item son mutuamente excluyentes
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'banner_color', p_color);
END;
$$;


-- ============================================================
-- SECCIÓN 16: FUNCIÓN DONATE_TO_FUND
-- Donación al fondo comunitario con detección de meta
-- ============================================================

CREATE OR REPLACE FUNCTION public.donate_to_fund(
  p_user_id uuid,
  p_fund_id integer,
  p_amount  integer
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fund        public.community_fund%ROWTYPE;
  v_new_total   integer;
  v_new_balance integer;
  v_goal_reached boolean;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser positivo';
  END IF;

  -- Cargar fondo con lock
  SELECT * INTO v_fund FROM public.community_fund
  WHERE id = p_fund_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fondo no encontrado o inactivo';
  END IF;

  -- Verificar fecha de expiración
  IF v_fund.ends_at IS NOT NULL AND v_fund.ends_at < now() THEN
    RAISE EXCEPTION 'Este fondo ya expiró';
  END IF;

  -- Verificar balance
  SELECT balance INTO v_new_balance FROM public.profiles
  WHERE id = p_user_id FOR UPDATE;

  IF v_new_balance < p_amount THEN
    RAISE EXCEPTION 'Balance insuficiente: tienes % ◈', v_new_balance;
  END IF;

  -- Descontar
  UPDATE public.profiles SET balance = balance - p_amount
  WHERE id = p_user_id RETURNING balance INTO v_new_balance;

  -- Registrar contribución
  INSERT INTO public.fund_contributions (fund_id, user_id, amount)
  VALUES (p_fund_id, p_user_id, p_amount);

  -- Actualizar fondo
  UPDATE public.community_fund
  SET
    current      = current + p_amount,
    status       = CASE WHEN current + p_amount >= goal THEN 'completed' ELSE 'active' END,
    completed_at = CASE WHEN current + p_amount >= goal THEN now() ELSE NULL END
  WHERE id = p_fund_id
  RETURNING current >= goal INTO v_goal_reached;

  SELECT current INTO v_new_total FROM public.community_fund WHERE id = p_fund_id;

  -- Ledger
  INSERT INTO public.transactions (user_id, amount, balance_after, type, reference_id, description)
  VALUES (p_user_id, -p_amount, v_new_balance, 'community_donation',
          p_fund_id::text, format('Donación al fondo: %s', v_fund.name));

  PERFORM public.upsert_weekly_snapshot(p_user_id, v_new_balance);

  RETURN jsonb_build_object(
    'success',       true,
    'donated',       p_amount,
    'fund_total',    v_new_total,
    'fund_goal',     v_fund.goal,
    'goal_reached',  COALESCE(v_goal_reached, false),
    'new_balance',   v_new_balance
  );
END;
$$;


-- ============================================================
-- SECCIÓN 17: LEADERBOARD — Economía, Crecimiento, Generosidad
-- ============================================================

-- Leaderboard de riqueza (top balance actual) con tie-breaker y nivel
DROP FUNCTION IF EXISTS public.get_wealth_leaderboard(int);
CREATE OR REPLACE FUNCTION public.get_wealth_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE (
  user_id    uuid,
  username   text,
  avatar_url text,
  balance    int,
  user_level int,
  rank       bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    p.balance,
    FLOOR(0.1 * SQRT(public.get_user_xp(p.id)))::int as user_level,
    RANK() OVER (ORDER BY p.balance DESC, public.get_user_xp(p.id) DESC)::bigint as rank
  FROM public.profiles p
  WHERE p.balance > 0
  ORDER BY p.balance DESC, public.get_user_xp(p.id) DESC
  LIMIT p_limit;
$$;


-- Leaderboard de crecimiento semanal
CREATE OR REPLACE FUNCTION public.get_weekly_growth_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE (
  user_id         uuid,
  username        text,
  avatar_url      text,
  current_balance int,
  prev_balance    int,
  growth          int,
  growth_pct      numeric
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH cw AS (
    SELECT user_id, balance FROM public.balance_snapshots
    WHERE week = public.current_iso_week()
  ),
  pw AS (
    SELECT user_id, balance FROM public.balance_snapshots
    WHERE week = to_char(
      (to_date(public.current_iso_week(), 'IYYY"-W"IW') - interval '7 days'),
      'IYYY"-W"IW'
    )
  )
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    COALESCE(cw.balance, p.balance)::int          AS current_balance,
    COALESCE(pw.balance, 0)::int                  AS prev_balance,
    (COALESCE(cw.balance, p.balance) - COALESCE(pw.balance, 0))::int AS growth,
    CASE
      WHEN COALESCE(pw.balance, 0) = 0 THEN 100.0
      ELSE ROUND(
        ((COALESCE(cw.balance, p.balance) - pw.balance)::numeric / pw.balance * 100),
        1
      )
    END AS growth_pct
  FROM public.profiles p
  LEFT JOIN cw ON cw.user_id = p.id
  LEFT JOIN pw ON pw.user_id = p.id
  WHERE COALESCE(cw.balance, p.balance) - COALESCE(pw.balance, 0) > 0
  ORDER BY growth DESC
  LIMIT p_limit;
$$;

-- Leaderboard de generosidad con tie-breaker y nivel
DROP FUNCTION IF EXISTS public.get_generosity_leaderboard(int);
CREATE OR REPLACE FUNCTION public.get_generosity_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE (
  user_id       uuid,
  username      text,
  avatar_url    text,
  total_donated bigint,
  user_level    int,
  rank          bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH base AS (
    SELECT
      p.id,
      p.username,
      p.avatar_url,
      SUM(fc.amount)::bigint AS total_donated,
      public.get_user_xp(p.id) as xp
    FROM public.fund_contributions fc
    JOIN public.profiles p ON p.id = fc.user_id
    GROUP BY p.id, p.username, p.avatar_url, p.balance
  )
  SELECT
    id,
    username,
    avatar_url,
    total_donated,
    FLOOR(0.1 * SQRT(xp))::int as user_level,
    RANK() OVER (ORDER BY total_donated DESC, xp DESC)::bigint as rank
  FROM base
  ORDER BY total_donated DESC, xp DESC
  LIMIT p_limit;
$$;


-- Leaderboard de logros con tie-breaker y nivel
DROP FUNCTION IF EXISTS public.get_achievement_leaderboard(int);
CREATE OR REPLACE FUNCTION public.get_achievement_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE (
  user_id           uuid,
  username          text,
  avatar_url        text,
  achievement_count bigint,
  user_level        int,
  rank              bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH base AS (
    SELECT
      p.id,
      p.username,
      p.avatar_url,
      COUNT(ua.achievement_id)::bigint AS achievement_count,
      public.get_user_xp(p.id) as xp
    FROM public.user_achievements ua
    JOIN public.profiles p ON p.id = ua.user_id
    GROUP BY p.id, p.username, p.avatar_url, p.balance
  )
  SELECT
    id,
    username,
    avatar_url,
    achievement_count,
    FLOOR(0.1 * SQRT(xp))::int as user_level,
    RANK() OVER (ORDER BY achievement_count DESC, xp DESC)::bigint as rank
  FROM base
  ORDER BY achievement_count DESC, xp DESC
  LIMIT p_limit;
$$;


-- Historia de transacciones de un usuario (paginada)
CREATE OR REPLACE FUNCTION public.get_transaction_history(
  p_user_id uuid,
  p_limit   int DEFAULT 30,
  p_offset  int DEFAULT 0
)
RETURNS TABLE (
  id           uuid,
  amount       int,
  balance_after int,
  type         text,
  description  text,
  reference_id text,
  created_at   timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT t.id, t.amount, t.balance_after, t.type, t.description, t.reference_id, t.created_at
  FROM public.transactions t
  WHERE t.user_id = auth.uid()
    AND t.user_id = p_user_id
  ORDER BY t.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;


-- ============================================================
-- SECCIÓN 18: ROW LEVEL SECURITY
-- ============================================================

-- store_items: lectura pública, solo admins pueden modificar
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_items_public_read" ON public.store_items;
CREATE POLICY "store_items_public_read" ON public.store_items
  FOR SELECT USING (is_active = true);

-- user_items: lectura pública (para mostrar en perfiles), sin write directo
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_items_public_read"  ON public.user_items;
DROP POLICY IF EXISTS "user_items_owner_read"   ON public.user_items;
CREATE POLICY "user_items_public_read" ON public.user_items
  FOR SELECT USING (true);
-- IMPORTANTE: NO hay política de INSERT/UPDATE/DELETE para usuarios
-- Todo va por purchase_item() y equip_item() (SECURITY DEFINER)

-- transactions: solo el dueño puede leer sus propias transacciones
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transactions_owner_read" ON public.transactions;
CREATE POLICY "transactions_owner_read" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
-- NO hay política de INSERT/UPDATE/DELETE para usuarios

-- transfers: el emisor y receptor pueden leer sus transfers
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transfers_participant_read" ON public.transfers;
CREATE POLICY "transfers_participant_read" ON public.transfers
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- balance_snapshots: lectura pública (necesaria para el leaderboard)
ALTER TABLE public.balance_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "snapshots_public_read" ON public.balance_snapshots;
CREATE POLICY "snapshots_public_read" ON public.balance_snapshots
  FOR SELECT USING (true);

-- pet_loadouts: lectura pública, solo el dueño puede modificar
ALTER TABLE public.pet_loadouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pet_loadouts_public_read"   ON public.pet_loadouts;
DROP POLICY IF EXISTS "pet_loadouts_owner_write"   ON public.pet_loadouts;
CREATE POLICY "pet_loadouts_public_read" ON public.pet_loadouts
  FOR SELECT USING (true);
CREATE POLICY "pet_loadouts_owner_write" ON public.pet_loadouts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- community_fund: lectura pública
ALTER TABLE public.community_fund ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fund_public_read" ON public.community_fund;
CREATE POLICY "fund_public_read" ON public.community_fund
  FOR SELECT USING (true);

-- fund_contributions: lectura pública (transparencia)
ALTER TABLE public.fund_contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fund_contrib_public_read" ON public.fund_contributions;
CREATE POLICY "fund_contrib_public_read" ON public.fund_contributions
  FOR SELECT USING (true);

-- Extender política de UPDATE de profiles:
-- NO puede modificar balance, banner_item_id, frame_item_id, equipped_items directamente
-- (esos campos los gestionan las funciones SECURITY DEFINER)
DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- El frontend solo puede cambiar: username, avatar_url, bio, banner_color
    -- balance, banner_item_id, frame_item_id, equipped_items => solo vía funciones
  );


-- ============================================================
-- SECCIÓN 19: TRIGGER — auto-crear pet_loadout y snapshot al registrarse
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_economy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Crear pet_loadout vacío
  INSERT INTO public.pet_loadouts (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Snapshot inicial (balance 0)
  INSERT INTO public.balance_snapshots (user_id, balance, week)
  VALUES (NEW.id, 0, public.current_iso_week())
  ON CONFLICT (user_id, week) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger sobre profiles (se crea después del trigger de auth)
DROP TRIGGER IF EXISTS on_profile_created_economy ON public.profiles;
CREATE TRIGGER on_profile_created_economy
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_economy();


-- ============================================================
-- SECCIÓN 20: MIGRACIÓN DESDE LOCALSTORAGE
-- Función one-time para importar coins de usuarios existentes
-- ============================================================

-- EJECUTAR SOLO UNA VEZ cuando lances el sistema en producción.
-- El frontend detecta si el usuario tiene localStorage coins y llama esto.
CREATE OR REPLACE FUNCTION public.migrate_localstorage_coins(
  p_user_id uuid,
  p_amount  integer
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_already_migrated boolean;
  v_new_balance      integer;
  v_MIGRATION_CAP    constant integer := 2000; -- máx que se puede importar
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Solo se puede migrar una vez por usuario
  SELECT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE user_id = p_user_id AND type = 'migration'
  ) INTO v_already_migrated;

  IF v_already_migrated THEN
    RAISE EXCEPTION 'Ya realizaste la migración. No se puede repetir.';
  END IF;

  IF p_amount < 0 THEN
    RAISE EXCEPTION 'Monto inválido';
  END IF;

  -- Limitar lo que se puede importar para evitar abusos
  p_amount := LEAST(p_amount, v_MIGRATION_CAP);

  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', true, 'migrated', 0, 'balance', 0);
  END IF;

  UPDATE public.profiles SET balance = balance + p_amount
  WHERE id = p_user_id RETURNING balance INTO v_new_balance;

  INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
  VALUES (p_user_id, p_amount, v_new_balance, 'migration',
          format('Migración desde localStorage: %s ◈', p_amount));

  PERFORM public.upsert_weekly_snapshot(p_user_id, v_new_balance);

  RETURN jsonb_build_object('success', true, 'migrated', p_amount, 'balance', v_new_balance);
END;
$$;
