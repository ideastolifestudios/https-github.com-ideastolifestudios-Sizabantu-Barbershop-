import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.name || 'Component'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-12 text-center bg-slate-50/50 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-slate-200/20">
          <div className="w-16 h-16 bg-brand-red/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-brand-red" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-4">Something went wrong</h2>
          <p className="text-white/40 mb-8 max-w-md mx-auto text-sm font-serif italic">We encountered an error loading this module. Our team has been notified. Please try refreshing.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-brand-red text-white px-8 py-3 rounded-full font-black uppercase tracking-widest text-[9px] shadow-xl shadow-red-500/20"
          >
            Refresh Interface
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
