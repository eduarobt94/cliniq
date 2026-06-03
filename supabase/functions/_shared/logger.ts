export function createLogger(traceId: string) {
  return {
    info:  (msg: string, ctx?: Record<string, unknown>) =>
      console.log(JSON.stringify({ level: 'info',  msg, traceId, ...ctx, ts: Date.now() })),
    error: (msg: string, ctx?: Record<string, unknown>) =>
      console.error(JSON.stringify({ level: 'error', msg, traceId, ...ctx, ts: Date.now() })),
    warn:  (msg: string, ctx?: Record<string, unknown>) =>
      console.warn(JSON.stringify({ level: 'warn',  msg, traceId, ...ctx, ts: Date.now() })),
  };
}
