import { Component } from "react";

/**
 * Catches render/runtime errors in the tree below it and shows a friendly
 * fallback instead of a white screen. Used to wrap route content so a single
 * page error never takes down the whole app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep a console trail for debugging; no external reporting configured.
    console.error("ErrorBoundary caught an error:", error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="w-full max-w-md rounded-lg border border-dashed bg-muted/20 p-8 text-center">
            <div className="text-base font-semibold">Something went wrong</div>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              This section failed to load. You can retry, or head back to the
              dashboard.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Try again
              </button>
              <a
                href="/dashboard"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Go to dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
