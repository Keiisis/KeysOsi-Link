-- ══════════════════════════════════════════════════════════════
-- MIGRATION : WAF Offense Active — Fonctions RPC & Maintenance
-- À EXÉCUTER dans Supabase Dashboard > SQL Editor
-- Dépendances : 20260601_waf_ultimate_defense
-- ══════════════════════════════════════════════════════════════

-- ── 1. Fonction : Évaluation de requête (cerveau décisionnel) ─
-- Retourne l'action à prendre : allow, tarpit, deceive, block, honeypot
-- Appelée par le middleware à chaque requête suspecte
CREATE OR REPLACE FUNCTION public.waf_evaluate_request(
    p_ip              TEXT,
    p_path            TEXT DEFAULT '/',
    p_fingerprint_hash TEXT DEFAULT '',
    p_user_agent      TEXT DEFAULT ''
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ip_trust      INTEGER := 50;
    v_fp_trust      INTEGER := 50;
    v_effective_trust INTEGER;
    v_action        TEXT := 'allow';
    v_delay_ms      INTEGER := 0;
    v_jitter        INTEGER := 0;
    v_payload       JSON := null;
    v_is_whitelisted BOOLEAN := false;
    v_fp_known_bad  BOOLEAN := false;
    v_ip_hopper     BOOLEAN := false;
BEGIN
    -- ── Check whitelist ───────────────────────────────────────
    SELECT EXISTS (
        SELECT 1 FROM public.waf_config
        WHERE key = 'whitelisted_ips'
        AND value::jsonb ? p_ip
    ) INTO v_is_whitelisted;

    IF v_is_whitelisted THEN
        RETURN json_build_object(
            'action', 'allow',
            'delay_ms', 0,
            'reason', 'IP whitelistée',
            'trust_score', 100
        );
    END IF;

    -- ── Récupérer le trust score IP ───────────────────────────
    SELECT trust_score, ip_hopper
    INTO v_ip_trust, v_ip_hopper
    FROM public.waf_ip_memory
    WHERE ip = p_ip;

    IF NOT FOUND THEN
        v_ip_trust := 50;
        v_ip_hopper := false;
    END IF;

    -- ── Récupérer le trust score du fingerprint ───────────────
    IF p_fingerprint_hash != '' AND p_fingerprint_hash IS NOT NULL THEN
        SELECT trust_score, is_known_bad
        INTO v_fp_trust, v_fp_known_bad
        FROM public.waf_device_fingerprints
        WHERE hash = p_fingerprint_hash;

        IF NOT FOUND THEN
            v_fp_trust := 50;
            v_fp_known_bad := false;
        END IF;

        -- Fingerprint connu comme dangereux → blocage immédiat
        -- même si l'IP est nouvelle (détection IP-hopper)
        IF v_fp_known_bad THEN
            -- Mettre à jour l'IP comme IP-hopper
            UPDATE public.waf_ip_memory
            SET ip_hopper = true,
                trust_score = LEAST(trust_score, 5)
            WHERE ip = p_ip;

            RETURN json_build_object(
                'action', 'block',
                'delay_ms', 0,
                'reason', 'Device fingerprint connu comme dangereux (IP-hopper détecté)',
                'trust_score', v_fp_trust,
                'fingerprint_known_bad', true
            );
        END IF;
    END IF;

    -- ── Trust effectif = min(IP, fingerprint) ────────────────
    -- Le trust effectif est le minimum des deux scores
    -- → un attaquant qui change d'IP garde son mauvais fingerprint
    v_effective_trust := LEAST(v_ip_trust, v_fp_trust);

    -- ══ CORRECTION 5 : Corrélation Campaign ══════════════════
    -- Si le fingerprint est associé à une campagne d'attaque active,
    -- forcer la déception ou le blocage même si le trust est élevé
    IF p_fingerprint_hash != '' THEN
        DECLARE
            v_campaign_count INTEGER := 0;
        BEGIN
            -- Vérifier si une des IPs associées au fingerprint
            -- fait partie d'une campagne active
            SELECT COUNT(*) INTO v_campaign_count
            FROM public.waf_campaigns c
            WHERE c.status = 'active'
            AND EXISTS (
                SELECT 1 FROM public.waf_device_fingerprints fp
                WHERE fp.hash = p_fingerprint_hash
                AND fp.associated_ips && c.source_ips
            );

            IF v_campaign_count > 0 THEN
                -- L'IP fait partie d'une campagne organisée
                -- → Forcer la déception pour récolter plus d'infos
                v_effective_trust := LEAST(v_effective_trust, 12);

                -- Marquer l'IP comme liée à une campagne
                UPDATE public.waf_ip_memory
                SET trust_score = LEAST(trust_score, 12),
                    ip_hopper = true
                WHERE ip = p_ip;
            END IF;
        END;
    END IF;

    -- ══ Check Honeypot Path ═══════════════════════════════════
    -- Si le chemin accédé est un piège connu, activer la déception
    IF p_path ~ '^\/(wp-admin|wp-login\.php|phpmyadmin|\.env|\.git|adminer|xmlrpc|actuator|server-status|admin\.php|shell\.php|c99\.php|r57\.php|backup\.zip|config\.php|debug)' THEN
        -- Chemin piège → répondre avec un honeypot
        v_action := 'honeypot';

        SELECT json_build_object(
            'status_code', dp.status_code,
            'content_type', dp.content_type,
            'response_body', dp.response_body,
            'response_headers', dp.response_headers
        ) INTO v_payload
        FROM public.waf_deception_payloads dp
        WHERE dp.attack_type = 'honeypot' AND dp.enabled = true
        ORDER BY random()
        LIMIT 1;

        -- Dégrader le trust pour accès honeypot
        UPDATE public.waf_ip_memory
        SET trust_score = GREATEST(0, trust_score - 25),
            last_action = 'honeypot'
        WHERE ip = p_ip;

        -- Log l'interaction honeypot
        INSERT INTO public.waf_honeypot_interactions (
            ip, path, method, user_agent, fingerprint_hash,
            attack_type, payload_served
        ) VALUES (
            p_ip, p_path, 'GET', p_user_agent, p_fingerprint_hash,
            'honeypot', COALESCE(v_payload::text, '{}')
        );

        RETURN json_build_object(
            'action',        'honeypot',
            'delay_ms',      0,
            'trust_score',   v_effective_trust,
            'ip_trust',      v_ip_trust,
            'fp_trust',      v_fp_trust,
            'reason',        format('Honeypot path: %s', p_path),
            'payload',       v_payload,
            'ip_hopper',     v_ip_hopper
        );
    END IF;

    -- ── Décision par seuils ──────────────────────────────────
    IF v_effective_trust < 5 THEN
        -- BLOCAGE TOTAL : menace critique confirmée
        v_action := 'block';

    ELSIF v_effective_trust < 15 THEN
        -- DÉCEPTION : l'attaquant reçoit un faux payload
        -- On ne le bloque pas pour qu'il perde du temps
        v_action := 'deceive';

        -- Récupérer un payload de déception aléatoire
        SELECT json_build_object(
            'status_code', dp.status_code,
            'content_type', dp.content_type,
            'response_body', dp.response_body,
            'response_headers', dp.response_headers
        ) INTO v_payload
        FROM public.waf_deception_payloads dp
        WHERE dp.enabled = true
        ORDER BY random()
        LIMIT 1;

        -- Incrémenter le compteur de déceptions
        UPDATE public.waf_ip_memory
        SET deception_count = deception_count + 1
        WHERE ip = p_ip;

    ELSIF v_effective_trust < 30 THEN
        -- TARPIT : ralentissement progressif
        v_action := 'tarpit';

        SELECT tc.delay_ms, tc.jitter_ms
        INTO v_delay_ms, v_jitter
        FROM public.waf_tarpit_config tc
        WHERE tc.enabled = true
        AND v_effective_trust >= tc.trust_min
        AND v_effective_trust < tc.trust_max
        LIMIT 1;

        IF NOT FOUND THEN
            -- Fallback : calcul linéaire
            v_delay_ms := (30 - v_effective_trust) * 200;
            v_jitter := 500;
        END IF;

        -- Ajouter du jitter aléatoire
        v_delay_ms := v_delay_ms + floor(random() * v_jitter * 2 - v_jitter)::integer;
        v_delay_ms := GREATEST(0, LEAST(v_delay_ms, 8000)); -- Cap à 8s pour Vercel

        -- Mettre à jour le niveau de tarpit
        UPDATE public.waf_ip_memory
        SET tarpit_level = GREATEST(tarpit_level, (30 - v_effective_trust) / 5),
            -- ══ TARPIT DECAY : chaque tarpit dégrade le trust (-3) ══
            trust_score = GREATEST(0, trust_score - 3)
        WHERE ip = p_ip;

    ELSE
        -- ALLOW : requête légitime
        v_action := 'allow';
    END IF;

    -- ── Mettre à jour la dernière action ─────────────────────
    UPDATE public.waf_ip_memory
    SET last_action = v_action,
        last_seen = now()
    WHERE ip = p_ip;

    -- ── Retourner la décision ────────────────────────────────
    RETURN json_build_object(
        'action',        v_action,
        'delay_ms',      v_delay_ms,
        'trust_score',   v_effective_trust,
        'ip_trust',      v_ip_trust,
        'fp_trust',      v_fp_trust,
        'reason',        CASE v_action
            WHEN 'block'   THEN 'Trust score critique'
            WHEN 'deceive' THEN 'Déception active — faux payload envoyé'
            WHEN 'tarpit'  THEN format('Tarpitting %sms (trust decay -3)', v_delay_ms)
            ELSE 'Requête autorisée'
        END,
        'payload',       v_payload,
        'ip_hopper',     v_ip_hopper
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.waf_evaluate_request TO service_role;

-- ── 2. Fonction : Enregistrer un fingerprint ──────────────────
-- Upsert atomique + détection d'IP-hopping
CREATE OR REPLACE FUNCTION public.waf_register_fingerprint(
    p_ip              TEXT,
    p_hash            TEXT,
    p_components      JSONB DEFAULT '{}'
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_ips  TEXT[];
    v_ip_count      INTEGER;
    v_is_hopper     BOOLEAN := false;
BEGIN
    -- Upsert le fingerprint
    INSERT INTO public.waf_device_fingerprints (
        hash, components, associated_ips, first_seen, last_seen,
        total_requests, trust_score
    ) VALUES (
        p_hash, p_components, ARRAY[p_ip], now(), now(), 1, 50
    )
    ON CONFLICT (hash) DO UPDATE SET
        last_seen       = now(),
        total_requests  = waf_device_fingerprints.total_requests + 1,
        associated_ips  = CASE
            WHEN NOT (p_ip = ANY(waf_device_fingerprints.associated_ips))
            THEN array_append(waf_device_fingerprints.associated_ips, p_ip)
            ELSE waf_device_fingerprints.associated_ips
        END,
        components      = CASE
            WHEN p_components != '{}'::jsonb THEN p_components
            ELSE waf_device_fingerprints.components
        END
    RETURNING associated_ips INTO v_existing_ips;

    -- Compter les IPs distinctes pour ce fingerprint
    v_ip_count := array_length(v_existing_ips, 1);

    -- Détection IP-hopping : même fingerprint, 3+ IPs
    IF v_ip_count >= 3 THEN
        v_is_hopper := true;

        -- Marquer le fingerprint comme suspect
        UPDATE public.waf_device_fingerprints
        SET tags = CASE
            WHEN NOT ('ip_hopper' = ANY(tags))
            THEN array_append(tags, 'ip_hopper')
            ELSE tags
        END,
        trust_score = GREATEST(0, trust_score - 10)
        WHERE hash = p_hash;

        -- Marquer toutes les IPs associées
        UPDATE public.waf_ip_memory
        SET ip_hopper = true
        WHERE ip = ANY(v_existing_ips);

        -- Alerte si c'est la première détection (exactement 3 IPs)
        IF v_ip_count = 3 THEN
            INSERT INTO public.waf_alerts (level, message, context)
            VALUES (
                'warning',
                format('IP-Hopper détecté : fingerprint %s vu depuis %s IPs distinctes', p_hash, v_ip_count),
                jsonb_build_object('fingerprint', p_hash, 'ips', to_jsonb(v_existing_ips), 'ip_count', v_ip_count)
            );
        END IF;
    END IF;

    -- Associer le fingerprint à l'IP dans waf_ip_memory
    UPDATE public.waf_ip_memory
    SET fingerprint_hashes = CASE
        WHEN NOT (p_hash = ANY(fingerprint_hashes))
         AND array_length(fingerprint_hashes, 1) IS DISTINCT FROM NULL
         AND array_length(fingerprint_hashes, 1) < 10
        THEN array_append(fingerprint_hashes, p_hash)
        WHEN NOT (p_hash = ANY(fingerprint_hashes))
         AND (array_length(fingerprint_hashes, 1) IS NULL)
        THEN ARRAY[p_hash]
        ELSE fingerprint_hashes
    END
    WHERE ip = p_ip;

    RETURN json_build_object(
        'hash', p_hash,
        'ip_count', v_ip_count,
        'is_hopper', v_is_hopper,
        'ips', to_jsonb(v_existing_ips)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.waf_register_fingerprint TO service_role;

-- ── 3. Fonction : Récupérer un payload de déception ───────────
-- Rotation pondérée pour varier les réponses
CREATE OR REPLACE FUNCTION public.waf_get_deception_payload(
    p_attack_type TEXT DEFAULT 'scanner_detection'
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payload JSON;
BEGIN
    -- Chercher un payload pour le type d'attaque spécifique
    SELECT json_build_object(
        'id', id,
        'status_code', status_code,
        'content_type', content_type,
        'response_body', response_body,
        'response_headers', response_headers,
        'payload_name', payload_name
    ) INTO v_payload
    FROM public.waf_deception_payloads
    WHERE attack_type = p_attack_type
    AND enabled = true
    ORDER BY random() * rotation_weight DESC
    LIMIT 1;

    -- Fallback : payload générique scanner
    IF v_payload IS NULL THEN
        SELECT json_build_object(
            'id', id,
            'status_code', status_code,
            'content_type', content_type,
            'response_body', response_body,
            'response_headers', response_headers,
            'payload_name', payload_name
        ) INTO v_payload
        FROM public.waf_deception_payloads
        WHERE enabled = true
        ORDER BY random()
        LIMIT 1;
    END IF;

    RETURN v_payload;
END;
$$;

GRANT EXECUTE ON FUNCTION public.waf_get_deception_payload TO service_role;

-- ── 4. Fonction : Calculer le délai tarpit ────────────────────
CREATE OR REPLACE FUNCTION public.waf_tarpit_delay(
    p_trust_score INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_delay INTEGER := 0;
    v_jitter INTEGER := 0;
BEGIN
    SELECT delay_ms, jitter_ms
    INTO v_delay, v_jitter
    FROM public.waf_tarpit_config
    WHERE enabled = true
    AND p_trust_score >= trust_min
    AND p_trust_score < trust_max
    LIMIT 1;

    IF NOT FOUND THEN
        -- Fallback linéaire
        IF p_trust_score < 30 THEN
            v_delay := (30 - p_trust_score) * 200;
            v_jitter := 500;
        ELSE
            v_delay := 0;
            v_jitter := 0;
        END IF;
    END IF;

    -- Appliquer le jitter
    v_delay := v_delay + floor(random() * v_jitter * 2 - v_jitter)::integer;
    v_delay := GREATEST(0, LEAST(v_delay, 8000));

    RETURN json_build_object(
        'delay_ms', v_delay,
        'trust_score', p_trust_score
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.waf_tarpit_delay TO service_role;

-- ── 5. Fonction : Maintenance quotidienne ─────────────────────
-- À appeler via cron ou edge function (1x/jour)
CREATE OR REPLACE FUNCTION public.waf_daily_maintenance()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cleaned_logs      INTEGER := 0;
    v_cleaned_alerts    INTEGER := 0;
    v_cleaned_campaigns INTEGER := 0;
    v_cleaned_fps       INTEGER := 0;
    v_rehabilitated_ips INTEGER := 0;
    v_cleaned_hp        INTEGER := 0;
BEGIN
    -- 1. Supprimer les logs WAF de plus de 30 jours
    DELETE FROM public.waf_logs WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS v_cleaned_logs = ROW_COUNT;

    -- 2. Alertes résolues de plus de 7 jours
    DELETE FROM public.waf_alerts WHERE resolved = true AND created_at < now() - interval '7 days';
    GET DIAGNOSTICS v_cleaned_alerts = ROW_COUNT;

    -- 3. Campagnes résolues de plus de 14 jours
    DELETE FROM public.waf_campaigns WHERE status = 'resolved' AND last_seen < now() - interval '14 days';
    GET DIAGNOSTICS v_cleaned_campaigns = ROW_COUNT;

    -- 4. Fingerprints inactifs depuis 90 jours (trust > 60 = légitimes)
    DELETE FROM public.waf_device_fingerprints
    WHERE last_seen < now() - interval '90 days' AND trust_score > 60;
    GET DIAGNOSTICS v_cleaned_fps = ROW_COUNT;

    -- 5. Interactions honeypot de plus de 60 jours
    DELETE FROM public.waf_honeypot_interactions
    WHERE created_at < now() - interval '60 days';
    GET DIAGNOSTICS v_cleaned_hp = ROW_COUNT;

    -- 6. Réhabilitation : IPs sans activité depuis 30 jours → trust +5
    UPDATE public.waf_ip_memory
    SET trust_score = LEAST(100, trust_score + 5)
    WHERE last_seen < now() - interval '30 days'
    AND trust_score < 50
    AND trust_score > 10;
    GET DIAGNOSTICS v_rehabilitated_ips = ROW_COUNT;

    -- 7. Débloquer les IPs auto-bloquées inactives depuis 7 jours
    -- (si leur trust est remonté à > 20)
    UPDATE public.ip_blocks
    SET unblocked_at = now()
    WHERE unblocked_at IS NULL
    AND blocked_by IN ('auto', 'autonomous_waf')
    AND blocked_at < now() - interval '7 days'
    AND EXISTS (
        SELECT 1 FROM public.waf_ip_memory
        WHERE waf_ip_memory.ip = ip_blocks.ip
        AND waf_ip_memory.trust_score > 20
    );

    RETURN json_build_object(
        'cleaned_logs',      v_cleaned_logs,
        'cleaned_alerts',    v_cleaned_alerts,
        'cleaned_campaigns', v_cleaned_campaigns,
        'cleaned_fingerprints', v_cleaned_fps,
        'cleaned_honeypot_interactions', v_cleaned_hp,
        'rehabilitated_ips', v_rehabilitated_ips,
        'executed_at',       now()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.waf_daily_maintenance TO service_role;

-- ── 6. Fonction : Mode urgence (lockdown) ─────────────────────
-- Active les protections maximales en cas d'attaque massive
CREATE OR REPLACE FUNCTION public.waf_emergency_lockdown()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_blocked_count INTEGER := 0;
BEGIN
    -- 1. Abaisser les seuils de tarpit (tout IP trust < 50 → tarpit)
    UPDATE public.waf_tarpit_config SET enabled = false;
    INSERT INTO public.waf_tarpit_config (trust_min, trust_max, delay_ms, jitter_ms, description, enabled) VALUES
        (30, 50, 3000, 1000, 'LOCKDOWN: tarpit toute IP suspecte', true);

    -- 2. Bloquer toutes les IPs avec trust < 25
    INSERT INTO public.ip_blocks (ip, reason, blocked_by, violation_count)
    SELECT ip, format('Emergency lockdown — trust=%s', trust_score), 'emergency_lockdown', blocked_count
    FROM public.waf_ip_memory
    WHERE trust_score < 25
    AND NOT EXISTS (
        SELECT 1 FROM public.ip_blocks
        WHERE ip_blocks.ip = waf_ip_memory.ip
        AND ip_blocks.unblocked_at IS NULL
    );
    GET DIAGNOSTICS v_blocked_count = ROW_COUNT;

    -- 3. Marquer tous les fingerprints trust < 20 comme dangereux
    UPDATE public.waf_device_fingerprints
    SET is_known_bad = true
    WHERE trust_score < 20;

    -- 4. Alerte nuclear
    INSERT INTO public.waf_alerts (level, message, context)
    VALUES (
        'nuclear',
        format('🚨 MODE URGENCE ACTIVÉ — %s IPs bloquées, seuils abaissés, fingerprints marqués', v_blocked_count),
        jsonb_build_object('blocked_count', v_blocked_count, 'triggered_at', now())
    );

    RETURN json_build_object(
        'status', 'lockdown_active',
        'blocked_ips', v_blocked_count,
        'message', format('Mode urgence activé — %s IPs bloquées', v_blocked_count)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.waf_emergency_lockdown TO service_role;

-- ── 7. Fonction améliorée : Stats WAF (inclut nouveaux modules) ─
CREATE OR REPLACE FUNCTION public.get_waf_stats(p_hours INTEGER DEFAULT 24)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_since TIMESTAMPTZ := now() - (p_hours || ' hours')::interval;
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_events',     COUNT(*),
        'blocked_count',    COUNT(*) FILTER (WHERE is_blocked = true),
        'unique_ips',       COUNT(DISTINCT ip),
        'tarpit_count',     COUNT(*) FILTER (WHERE action = 'tarpit'),
        'deceive_count',    COUNT(*) FILTER (WHERE action = 'deceive'),
        'honeypot_count',   COUNT(*) FILTER (WHERE action = 'honeypot' OR threat_type = 'honeypot'),
        'avg_delay_ms',     COALESCE(AVG(response_delay_ms) FILTER (WHERE response_delay_ms > 0), 0)::integer,
        'top_threats',      (
            SELECT json_agg(t) FROM (
                SELECT threat_type, COUNT(*) as count
                FROM public.waf_logs
                WHERE created_at >= v_since
                GROUP BY threat_type
                ORDER BY count DESC
                LIMIT 5
            ) t
        ),
        'top_attackers',    (
            SELECT json_agg(a) FROM (
                SELECT ip, COUNT(*) as count
                FROM public.waf_logs
                WHERE created_at >= v_since AND is_blocked = true
                GROUP BY ip
                ORDER BY count DESC
                LIMIT 10
            ) a
        ),
        'dangerous_ips',    (SELECT COUNT(*) FROM public.waf_ip_memory WHERE trust_score < 15),
        'ip_hoppers',       (SELECT COUNT(*) FROM public.waf_ip_memory WHERE ip_hopper = true),
        'active_campaigns', (SELECT COUNT(*) FROM public.waf_campaigns WHERE status = 'active'),
        'learned_rules',    (SELECT COUNT(*) FROM public.waf_learned_rules WHERE auto_active = true),
        'ip_blocks_active', (SELECT COUNT(*) FROM public.ip_blocks WHERE unblocked_at IS NULL),
        'known_bad_fps',    (SELECT COUNT(*) FROM public.waf_device_fingerprints WHERE is_known_bad = true),
        'total_fingerprints', (SELECT COUNT(*) FROM public.waf_device_fingerprints),
        'honeypot_interactions_24h', (
            SELECT COUNT(*) FROM public.waf_honeypot_interactions
            WHERE created_at >= v_since
        )
    ) INTO v_result
    FROM public.waf_logs
    WHERE created_at >= v_since;

    RETURN v_result;
END;
$$;

-- ── 8. Vérification ──────────────────────────────────────────
SELECT
    'waf_evaluate_request' AS function_name, 'OK' AS status
WHERE EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'waf_evaluate_request'
)
UNION ALL SELECT 'waf_register_fingerprint', 'OK'
WHERE EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'waf_register_fingerprint'
)
UNION ALL SELECT 'waf_get_deception_payload', 'OK'
WHERE EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'waf_get_deception_payload'
)
UNION ALL SELECT 'waf_daily_maintenance', 'OK'
WHERE EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'waf_daily_maintenance'
)
UNION ALL SELECT 'waf_emergency_lockdown', 'OK'
WHERE EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'waf_emergency_lockdown'
);

SELECT 'Migration 20260602_waf_active_offense : OK' AS status;
