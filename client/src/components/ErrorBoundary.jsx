import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught Error:", error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center bg-[#09090b] text-white">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="text-red-500" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
                    <p className="text-gray-400 mb-8 max-w-md">
                        Our systems encountered an unexpected error. The technical team has been notified.
                    </p>
                    <div className="bg-white/5 p-4 rounded-lg text-left w-full max-w-lg mb-8 overflow-auto max-h-40 border border-white/10">
                        <code className="text-xs text-red-400 font-mono">
                            {this.state.error?.toString()}
                        </code>
                    </div>
                    <button
                        onClick={this.handleReload}
                        className="flex items-center gap-2 bg-[var(--gold-primary)] text-black font-bold px-6 py-3 rounded-lg hover:opacity-90 transition"
                    >
                        <RefreshCw size={18} /> Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
