BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE FUNCTION public.configure_notification_email_schedule(p_base_url TEXT, p_worker_secret TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  existing_id UUID;
  config RECORD;
BEGIN
  IF p_base_url !~ '^https://[a-z0-9]+\.supabase\.co$' OR char_length(p_worker_secret) < 32 THEN
    RAISE EXCEPTION 'Invalid worker configuration';
  END IF;
  FOR config IN SELECT * FROM (VALUES
    ('notification_worker_url', p_base_url || '/functions/v1/notification-email-worker'),
    ('notification_worker_secret', p_worker_secret)
  ) AS settings(name, value) LOOP
    SELECT id INTO existing_id FROM vault.secrets WHERE name = config.name;
    IF existing_id IS NULL THEN
      PERFORM vault.create_secret(config.value, config.name);
    ELSE
      PERFORM vault.update_secret(existing_id, config.value, config.name);
    END IF;
  END LOOP;
  PERFORM cron.schedule('decerf-notification-emails', '* * * * *', $command$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notification_worker_url'),
      headers := jsonb_build_object('Content-Type','application/json','x-worker-secret',
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notification_worker_secret')),
      body := '{}'::jsonb, timeout_milliseconds := 60000
    );
  $command$);
END;
$$;
REVOKE ALL ON FUNCTION public.configure_notification_email_schedule(TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.configure_notification_email_schedule(TEXT,TEXT) TO service_role;
COMMIT;