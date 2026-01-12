import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log to error tracking service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service
      // Sentry.captureException(error, { extra: errorInfo });
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </h1>

              <p className="text-gray-600 mb-6">
                We're sorry for the inconvenience. The error has been logged and we'll look into it.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="w-full mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                  <p className="text-sm font-mono text-red-800 break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-600 cursor-pointer">
                        Stack trace
                      </summary>
                      <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                {/* Using native anchor tags as fallbacks in case React handlers fail */}
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    this.handleGoHome();
                  }}
                  className="flex-1"
                >
                  <Button
                    variant="outline"
                    fullWidth
                    type="button"
                  >
                    Go Home
                  </Button>
                </a>
                <a
                  href={window.location.href}
                  onClick={(e) => {
                    e.preventDefault();
                    this.handleReset();
                  }}
                  className="flex-1"
                >
                  <Button
                    variant="primary"
                    icon={<RefreshCw className="w-4 h-4" />}
                    iconPosition="left"
                    fullWidth
                    type="button"
                  >
                    Reload Page
                  </Button>
                </a>
              </div>

              {/* Fallback text links in case buttons don't render */}
              <div className="mt-4 text-sm text-gray-500">
                <p>
                  Still stuck?{' '}
                  <a
                    href="/"
                    className="text-[#0F5D5D] underline hover:text-[#0a4545]"
                    onClick={() => {
                      // Clear storage to help reset any broken state
                      try {
                        localStorage.clear();
                        sessionStorage.clear();
                      } catch (e) {
                        // Ignore storage errors
                      }
                    }}
                  >
                    Clear data and go home
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
