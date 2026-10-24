export function serverlessDatabaseUrl(
  rawUrl: string,
  isVercel = Boolean(process.env.VERCEL),
  poolerHost = process.env.SUPABASE_POOLER_HOST?.trim(),
  configuredProjectRef = process.env.SUPABASE_PROJECT_REF?.trim(),
) {
  if (!isVercel) return rawUrl;

  try {
    const url = new URL(rawUrl);
    const isSupabasePooler = url.hostname.endsWith('.pooler.supabase.com');
    const isSessionMode = url.port === '' || url.port === '5432';
    const validPoolerHost = poolerHost?.endsWith('.pooler.supabase.com') ? poolerHost : undefined;

    // Shared Supavisor poolers identify the tenant from both the exact pooler
    // host and the role-qualified username. Preview environments can carry an
    // older/session-mode URL, so an explicit public project ref lets us repair
    // those non-secret routing fields without touching the password/database.
    if (isSupabasePooler) {
      if (validPoolerHost) url.hostname = validPoolerHost;
      if (configuredProjectRef) {
        const role = url.username.split('.')[0] || url.username;
        if (!url.username.endsWith(`.${configuredProjectRef}`)) {
          url.username = `${role}.${configuredProjectRef}`;
        }
      }
      if (isSessionMode) url.port = '6543';
      return url.toString();
    }

    // Supabase direct database hosts are IPv6 by default, while Vercel's
    // serverless runtime does not provide IPv6 egress. When the project-specific
    // shared pooler host is configured, preserve the password/database/options
    // but switch host, username namespace and port to Supavisor transaction mode.
    const directMatch = /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(url.hostname);
    if (directMatch && validPoolerHost) {
      const projectRef = configuredProjectRef || directMatch[1];
      url.hostname = validPoolerHost;
      url.port = '6543';
      const role = url.username.split('.')[0] || url.username;
      if (!url.username.endsWith(`.${projectRef}`)) {
        url.username = `${role}.${projectRef}`;
      }
    }

    return url.toString();
  } catch {
    // Preserve the original value so pg/config validation remains the source of
    // truth for malformed or non-URL connection strings.
    return rawUrl;
  }
}
