export function serverlessDatabaseUrl(
  rawUrl: string,
  isVercel = Boolean(process.env.VERCEL),
  poolerHost = process.env.SUPABASE_POOLER_HOST?.trim(),
) {
  if (!isVercel) return rawUrl;

  try {
    const url = new URL(rawUrl);
    const isSupabasePooler = url.hostname.endsWith('.pooler.supabase.com');
    const isSessionMode = url.port === '' || url.port === '5432';

    // Supabase session mode pins one upstream connection per serverless client.
    // Vercel can fan out many warm functions, so the session pool is easy to
    // exhaust. Port 6543 is Supavisor transaction mode and is intended for
    // short-lived/serverless workloads. Credentials and TLS host stay the same.
    if (isSupabasePooler && isSessionMode) {
      url.port = '6543';
      return url.toString();
    }

    // Supabase direct database hosts are IPv6 by default, while Vercel's
    // serverless runtime does not provide IPv6 egress. When the project-specific
    // shared pooler host is configured, preserve the password/database/options
    // but switch host, username namespace and port to Supavisor transaction mode.
    const directMatch = /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(url.hostname);
    if (directMatch && poolerHost?.endsWith('.pooler.supabase.com')) {
      const projectRef = directMatch[1];
      url.hostname = poolerHost;
      url.port = '6543';
      if (!url.username.endsWith(`.${projectRef}`)) {
        url.username = `${url.username}.${projectRef}`;
      }
    }

    return url.toString();
  } catch {
    // Preserve the original value so pg/config validation remains the source of
    // truth for malformed or non-URL connection strings.
    return rawUrl;
  }
}
