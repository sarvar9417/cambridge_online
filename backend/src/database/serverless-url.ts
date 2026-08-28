export function serverlessDatabaseUrl(rawUrl: string, isVercel = Boolean(process.env.VERCEL)) {
  if (!isVercel) return rawUrl;

  try {
    const url = new URL(rawUrl);
    const isSupabasePooler = url.hostname.endsWith('.pooler.supabase.com');
    const isSessionMode = url.port === '' || url.port === '5432';

    // Supabase session mode pins one upstream connection per serverless client.
    // Vercel can fan out many warm functions, so the session pool is easy to
    // exhaust. Port 6543 is Supavisor transaction mode and is intended for
    // short-lived/serverless workloads. Credentials and TLS host stay the same.
    if (isSupabasePooler && isSessionMode) url.port = '6543';
    return url.toString();
  } catch {
    // Preserve the original value so pg/config validation remains the source of
    // truth for malformed or non-URL connection strings.
    return rawUrl;
  }
}
