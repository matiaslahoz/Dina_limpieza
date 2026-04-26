-- pg_cron: chequear habitaciones sin limpiar cada 30 minutos.
-- Reemplazar:
--   <PROJECT_REF>      → ref del proyecto (xxxxx en https://xxxxx.supabase.co)
--   <CRON_SECRET>      → mismo valor seteado en la env CRON_SECRET de la Edge Function
-- Habilitar previamente las extensiones desde Database → Extensions.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'notify-stale-rooms',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/notify-stale-rooms',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
