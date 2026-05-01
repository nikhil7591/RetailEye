import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onRetry === "function") {
      this.props.onRetry();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center shadow-lg">
            <p className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">RetailEye</p>
            <h1 className="mt-3 text-2xl font-bold text-[#0F172A]">Something crashed</h1>
            <p className="mt-2 text-sm text-[#64748B]">
              The dashboard hit an unexpected UI error. You can retry without losing the whole session.
            </p>
            {this.state.error && (
              <pre className="mt-4 overflow-auto rounded-xl bg-[#F8FAFC] p-4 text-left text-[11px] text-[#B91C1C]">
                {String(this.state.error?.message || this.state.error)}
              </pre>
            )}
            <button
              onClick={this.handleRetry}
              className="mt-6 rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4338CA]"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}