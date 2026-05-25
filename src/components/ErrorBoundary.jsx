import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="sca-root sca-loading-screen" role="alert">
          <div className="sca-card" style={{ maxWidth: 520 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>SmartClass could not start</h1>
            <p style={{ color: 'var(--sca-text-muted)', lineHeight: 1.6 }}>
              {this.state.error.message || 'A startup error occurred. Check the Supabase configuration and reload.'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
