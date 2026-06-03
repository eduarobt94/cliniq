import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'; // onFID removed in v5
import { Sentry } from './sentry';

function sendToSentry(metric) {
  Sentry.setMeasurement(metric.name, metric.value, metric.name === 'CLS' ? '' : 'millisecond');
}

function logToConsole(metric) {
  // En desarrollo: loggear en consola
  if (import.meta.env.DEV) {
    const color = metric.rating === 'good' ? 'green' : metric.rating === 'needs-improvement' ? 'orange' : 'red';
    console.log(`%c[Web Vitals] ${metric.name}: ${Math.round(metric.value)}${metric.name === 'CLS' ? '' : 'ms'} (${metric.rating})`, `color: ${color}`);
  }
}

export function initWebVitals() {
  const report = (metric) => {
    logToConsole(metric);
    if (import.meta.env.PROD) sendToSentry(metric);
  };

  onCLS(report);
  onFCP(report);
  onINP(report);
  onLCP(report);
  onTTFB(report);
}
