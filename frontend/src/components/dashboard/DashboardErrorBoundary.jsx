import { Component } from 'react';

export class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Dashboard rendering error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section role="alert" className="rounded-xl border border-[#a75545]/20 bg-[#f5e2dd] p-6 text-[#263238]">
          <h2 className="text-lg font-bold">{this.props.title ?? 'Dashboard could not be loaded'}</h2>
          <p className="mt-1 text-sm">{this.props.message ?? 'Please retry. The rest of the application is still available.'}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-[#4a7c59] px-4 py-2 font-semibold text-white">
            Retry
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}
