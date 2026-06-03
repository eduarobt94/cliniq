import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!DSN) return; // No-op en dev si no hay DSN configurado

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE, // 'development' | 'production'
    // Trazas de performance — muestrear el 10% de transacciones
    tracesSampleRate: 0.1,
    // Reproducción de sesiones — solo cuando hay error
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.0,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // No enviar en desarrollo local
    enabled: import.meta.env.PROD,
    // Ignorar errores comunes no accionables
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      /^Network request failed/,
      /^Failed to fetch/,
    ],
    beforeSend(event) {
      // No enviar errores de usuarios no autenticados (reduce ruido)
      return event;
    },
  });
}

export { Sentry };
