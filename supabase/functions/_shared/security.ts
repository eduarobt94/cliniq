/**
 * Cyber Neo CN-002: Cron authentication helpers.
 *
 * Cron-invoked functions validate a shared secret instead of using --no-verify-jwt.
 * The CRON_SECRET must be set as a Supabase Edge Function Secret in the Dashboard.
 * The pg_cron functions send it as X-Cron-Secret header.
 */

/**
 * Validates the X-Cron-Secret header against CRON_SECRET env var.
 * Returns true if the caller is an authorized internal cron trigger.
 */
export function verifyCronSecret(req: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) {
    // If CRON_SECRET is not configured, deny all (fail closed)
    console.error('[security] CRON_SECRET env var not set — denying request');
    return false;
  }
  const incoming = req.headers.get('X-Cron-Secret');
  return incoming === cronSecret;
}
