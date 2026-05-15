import { Component } from 'react';

/**
 * Dashboard-scoped error boundary.
 * Catches crashes inside any dashboard route without unmounting the full app
 * (AuthProvider, router) — the user can recover without a full page reload.
 */
export class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[DashboardErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 p-8 text-center">
          <div
            className="size-12 rounded-full flex items-center justify-center text-[22px]"
            style={{ backgroundColor: 'color-mix(in oklch, var(--cq-warn) 12%, transparent)' }}
          >
            ⚠️
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--cq-fg)] mb-1">
              Error en esta sección
            </h2>
            <p className="text-[13px] text-[var(--cq-fg-muted)] max-w-[320px]">
              Algo falló en esta página. Podés intentar recargarla sin afectar el resto de la aplicación.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleRetry}
              className="px-4 h-9 rounded-[8px] bg-[var(--cq-fg)] text-[var(--cq-bg)] text-[13px] font-medium hover:opacity-80 transition-opacity"
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 h-9 rounded-[8px] border border-[var(--cq-border)] text-[var(--cq-fg)] text-[13px] font-medium hover:bg-[var(--cq-surface-2)] transition-colors"
            >
              Recargar página
            </button>
          </div>
          {import.meta.env.DEV && (
            <details className="mt-2 text-left max-w-[500px] w-full">
              <summary className="text-[11px] text-[var(--cq-fg-muted)] cursor-pointer select-none">
                Detalle del error (dev only)
              </summary>
              <pre className="mt-2 text-[10px] bg-[var(--cq-surface-2)] rounded-[8px] p-3 overflow-auto text-[var(--cq-danger)] whitespace-pre-wrap break-all">
                {this.state.error?.message}
                {'\n'}
                {this.state.error?.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
