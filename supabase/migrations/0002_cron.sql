-- Penjadwal: pg_cron memanggil endpoint Next.js lewat pg_net.
-- Sebelum menjalankan migrasi ini, isi Vault (SQL editor Supabase):
--   select vault.create_secret('https://chatbot.talentiv.id', 'app_url');
--   select vault.create_secret('<nilai CRON_SECRET yang sama dengan env Vercel>', 'cron_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function panggil_cron(jalur text) returns bigint
language sql security definer set search_path = public as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url') || jalur,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$$;
revoke execute on function panggil_cron(text) from public, anon, authenticated;

select cron.schedule('jarkoman-sync', '0 * * * *', $$ select panggil_cron('/api/cron/sync') $$);
select cron.schedule('jarkoman-dispatch', '* * * * *', $$ select panggil_cron('/api/cron/dispatch') $$);
