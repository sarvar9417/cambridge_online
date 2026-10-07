import pg from 'pg';

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error('DATABASE_URL is required');

const url = new URL(rawUrl);
if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
  throw new Error('Refusing to bootstrap Supabase compatibility outside localhost');
}

const client = new pg.Client({ connectionString: rawUrl, ssl: false });
await client.connect();

try {
  await client.query(`
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
      if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
      if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
    end
    $$;

    create or replace function public.rls_auto_enable()
    returns void
    language sql
    security definer
    set search_path = pg_catalog, public
    as 'select null::void';
  `);
  console.log('Prepared localhost Supabase compatibility roles/function');
} finally {
  await client.end();
}
