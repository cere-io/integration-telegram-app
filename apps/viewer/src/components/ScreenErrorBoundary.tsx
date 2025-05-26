import React, { Component, ReactNode } from 'react';
import { Text, Button } from '@tg-app/ui';

interface Props {
  children: ReactNode;
  screenName: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ScreenErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`${this.props.screenName} Error:`, error, errorInfo);

    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: `${this.props.screenName}: ${error.message}`,
        fatal: false,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
          }}
        >
          <Text weight="2">Something went wrong with {this.props.screenName}</Text>
          <Text>We're working to fix this issue</Text>
          <Button size="s" onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </Button>
          <Button size="s" mode="plain" onClick={() => window.location.reload()}>
            Reload App
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
