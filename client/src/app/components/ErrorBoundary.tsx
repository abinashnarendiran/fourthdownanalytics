"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled view error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    const { children, title } = this.props;
    const { hasError } = this.state;

    if (!hasError) {
      return children;
    }

    return (
      <div
        role="alert"
        className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl space-y-3"
      >
        <h3 className="font-bold">{title ?? "Something went wrong"}</h3>
        <p className="text-sm opacity-80">
          This section failed to render. Try again to reload it.
        </p>
        <button
          type="button"
          onClick={this.handleReset}
          className="px-4 py-2 rounded text-white text-sm hover:opacity-90 transition"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Try again
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
