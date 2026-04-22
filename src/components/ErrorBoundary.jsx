import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--cq-bg)] text-[var(--cq-fg)]">
          <div className="text-center max-w-sm p-8">
            <div className="text-[40px] mb-4">⚠️</div>
            <h1 className="text-[20px] font-semibold tracking-tight mb-2">Algo salió mal</h1>
            <p className="text-[13.5px] text-[var(--cq-fg-muted)] mb-6">
              Ocurrió un error inesperado. Recargá la página para continuar.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 h-9 rounded-[8px] bg-[var(--cq-fg)] text-[var(--cq-bg)] text-[13px] font-medium hover:bg-[var(--cq-accent)] transition-colors"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
