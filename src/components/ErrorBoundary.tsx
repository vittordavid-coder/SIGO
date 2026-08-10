import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Smartphone } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400 shadow-xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Smartphone className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-black tracking-widest text-blue-400 uppercase">SYNERA MOBILE</span>
          </div>
          <h1 className="text-xl font-black text-white mb-2">
            {this.props.fallbackTitle || 'Ocorreu um erro ao carregar a tela'}
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
            {this.state.error?.message || 'Identificamos uma falha temporária no dispositivo. Toque abaixo para recarregar com segurança.'}
          </p>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar Aplicativo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
