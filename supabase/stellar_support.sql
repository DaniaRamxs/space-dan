
-- 🚀 space-dan :: Sistema de Apoyo Estelar
-- Permite enviar regalos, propinas y pagar deudas de otros usuarios.

-- 1. Extender tabla de transferencias para tipos de apoyo
ALTER TABLE public.transfers 
ADD COLUMN IF NOT EXISTS support_type text DEFAULT 'gift' 
CHECK (support_type IN ('gift', 'tip', 'financial_aid', 'bet', 'debt_payment'));

-- 2. Tabla para rastrear Guardianes Estelares (quién ayudó a pagar deudas)
CREATE TABLE IF NOT EXISTS public.debt_contributions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    loan_id uuid REFERENCES public.user_loans(id) ON DELETE CASCADE,
    amount integer NOT NULL CHECK (amount > 0),
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debt_contrib_recipient ON public.debt_contributions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_debt_contrib_donor ON public.debt_contributions(donor_id);

-- 3. Función para enviar Apoyo Estelar (Regalos/Propinas)
CREATE OR REPLACE FUNCTION public.send_stellar_support(
    p_from_id uuid,
    p_to_id uuid,
    p_amount integer,
    p_message text DEFAULT NULL,
    p_support_type text DEFAULT 'gift'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_fee integer;
    v_net integer;
    v_from_bal integer;
    v_to_bal integer;
    v_transfer_id uuid;
BEGIN
    -- Validaciones básicas
    IF auth.uid() != p_from_id THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    IF p_from_id = p_to_id THEN
        RAISE EXCEPTION 'No puedes enviarte apoyo a ti mismo';
    END IF;

    -- Verificar balance
    SELECT balance INTO v_from_bal FROM public.profiles WHERE id = p_from_id FOR UPDATE;
    IF v_from_bal < p_amount THEN
        RAISE EXCEPTION 'Balance insuficiente';
    END IF;

    -- Calcular comisión (5% base, 0% si es debt_payment o gift pequeño)
    v_fee := CASE 
        WHEN p_support_type = 'debt_payment' THEN 0 
        WHEN p_amount < 100 THEN 0
        ELSE floor(p_amount * 0.05) 
    END;
    v_net := p_amount - v_fee;

    -- Ejecutar transferencia
    UPDATE public.profiles SET balance = balance - p_amount WHERE id = p_from_id RETURNING balance INTO v_from_bal;
    UPDATE public.profiles SET balance = balance + v_net WHERE id = p_to_id RETURNING balance INTO v_to_bal;

    -- Registrar en transfers
    INSERT INTO public.transfers (from_user_id, to_user_id, amount, fee, net_amount, message, support_type)
    VALUES (p_from_id, p_to_id, p_amount, v_fee, v_net, p_message, p_support_type)
    RETURNING id INTO v_transfer_id;

    -- Ledger
    INSERT INTO public.transactions (user_id, amount, balance_after, type, reference_id, description)
    VALUES 
        (p_from_id, -p_amount, v_from_bal, 'transfer_out', v_transfer_id::text, 'Envío de Apoyo Estelar'),
        (p_to_id, v_net, v_to_bal, 'transfer_in', v_transfer_id::text, 'Recibiste Apoyo Estelar');

    -- Activity Feed Post
    INSERT INTO public.activity_posts (author_id, content)
    VALUES (p_from_id, format('Envió %s Starlys ◈ a @%s %s', p_amount, (SELECT username FROM public.profiles WHERE id = p_to_id), CASE WHEN p_message IS NOT NULL AND p_message != '' THEN format('— "%s"', p_message) ELSE '' END));
    
    RETURN jsonb_build_object('success', true, 'transfer_id', v_transfer_id, 'new_balance', v_from_bal);
END;
$$;

-- 4. Función para Apoyar a Jugadores Endeudados (Pagar deuda de otro)
CREATE OR REPLACE FUNCTION public.pay_user_debt(
    p_donor_id uuid,
    p_recipient_id uuid,
    p_amount integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_active_loan RECORD;
    v_donor_bal integer;
    v_payment integer;
    v_total_contributors integer;
    v_recipient_name text;
BEGIN
    SELECT username INTO v_recipient_name FROM public.profiles WHERE id = p_recipient_id;

    -- 1. Buscar la deuda activa del receptor
    SELECT * INTO v_active_loan FROM public.user_loans 
    WHERE user_id = p_recipient_id AND status = 'active' FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'no_active_debt');
    END IF;

    -- 2. Verificar balance del donante
    SELECT balance INTO v_donor_bal FROM public.profiles WHERE id = p_donor_id FOR UPDATE;
    IF v_donor_bal < p_amount THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient_funds');
    END IF;

    -- 3. Calcular cuánto se puede pagar
    v_payment := LEAST(p_amount, v_active_loan.remaining_debt);
    
    -- 4. Ejecutar el pago
    UPDATE public.user_loans 
    SET remaining_debt = remaining_debt - v_payment,
        status = CASE WHEN remaining_debt - v_payment <= 0 THEN 'paid' ELSE 'active' END
    WHERE id = v_active_loan.id;

    -- Restar balance al donante
    UPDATE public.profiles SET balance = balance - v_payment WHERE id = p_donor_id RETURNING balance INTO v_donor_bal;

    -- Si se pagó la deuda, quitar el Pacto Estelar
    IF (v_active_loan.remaining_debt - v_payment) <= 0 THEN
        UPDATE public.profiles SET stellar_pact_active = false WHERE id = p_recipient_id;
        
        -- Publicación especial por deuda saldada
        INSERT INTO public.activity_posts (author_id, content)
        VALUES (p_recipient_id, format('¡La comunidad ayudó a @%s a salir de su deuda! 🛡️✨', v_recipient_name));
    END IF;

    -- 5. Registrar contribución (Guardianes Estelares)
    INSERT INTO public.debt_contributions (donor_id, recipient_id, loan_id, amount)
    VALUES (p_donor_id, p_recipient_id, v_active_loan.id, v_payment);

    -- 6. Transacciones Ledger
    INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
    VALUES (p_donor_id, -v_payment, v_donor_bal, 'transfer_out', 'Apoyo a deuda de otro usuario');

    -- Activity Feed Post
    INSERT INTO public.activity_posts (author_id, content)
    VALUES (p_donor_id, format('Ayudó a @%s con ◈ %s para su recuperación financiera 🛡️', v_recipient_name, v_payment));

    -- Obtener cuántos han contribuido a esta deuda específica
    SELECT COUNT(DISTINCT donor_id) INTO v_total_contributors FROM public.debt_contributions WHERE loan_id = v_active_loan.id;

    RETURN jsonb_build_object(
        'success', true, 
        'payment', v_payment, 
        'remaining', v_active_loan.remaining_debt - v_payment,
        'debt_paid', (v_active_loan.remaining_debt - v_payment) <= 0,
        'contributors', v_total_contributors
    );
END;
$$;

-- 5. Vista para obtener Guardianes Estelares de un usuario
CREATE OR REPLACE VIEW public.stellar_guardians AS
SELECT 
    dc.recipient_id,
    p.username as donor_username,
    p.avatar_url as donor_avatar,
    SUM(dc.amount) as total_contributed,
    MAX(dc.created_at) as last_contribution
FROM public.debt_contributions dc
JOIN public.profiles p ON dc.donor_id = p.id
GROUP BY dc.recipient_id, p.username, p.avatar_url
ORDER BY total_contributed DESC;

-- 6. Función para obtener progreso de apoyo comunitario de una deuda
CREATE OR REPLACE FUNCTION public.get_debt_support_progress(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_loan RECORD;
    v_supported integer;
BEGIN
    SELECT * INTO v_loan FROM public.user_loans WHERE user_id = p_user_id AND status = 'active';
    IF NOT FOUND THEN RETURN NULL; END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_supported FROM public.debt_contributions WHERE loan_id = v_loan.id;

    RETURN jsonb_build_object(
        'total_debt', v_loan.total_debt,
        'remaining_debt', v_loan.remaining_debt,
        'support_received', v_supported,
        'original_borrowed', v_loan.amount_borrowed
    );
END;
$$;
