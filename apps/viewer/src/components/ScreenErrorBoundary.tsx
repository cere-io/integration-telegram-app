import React, { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Text, Button } from '@tg-app/ui';
import Reporting from '@tg-app/reporting';

interface ScreenErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  screenName: string;
}

function ScreenErrorFallback({ resetErrorBoundary, screenName }: ScreenErrorFallbackProps) {
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
      <Text weight="2">Something went wrong with {screenName}</Text>
      <Text>We're working to fix this issue</Text>
      <Button size="s" onClick={resetErrorBoundary}>
        Try Again
      </Button>
      <Button size="s" mode="plain" onClick={() => window.location.reload()}>
        Reload App
      </Button>
    </div>
  );
}

interface ScreenErrorBoundaryProps {
  children: ReactNode;
  screenName: string;
  fallback?: ReactNode;
}

export function ScreenErrorBoundary({ children, screenName, fallback }: ScreenErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error(`${screenName} Error:`, error, errorInfo);

    // Send to analytics using Reporting
    try {
      Reporting.message(
        `Screen error in ${screenName}: ${error.message}`,
        {
          context: 'screen_error_boundary',
          screenName: screenName,
          errorStack: error.stack || 'No stack trace',
          componentStack: errorInfo.componentStack || 'No component stack',
        },
        'error',
      );
    } catch (analyticsError) {
      console.warn('Failed to send error to reporting:', analyticsError);
    }
  };

  return (
    <ErrorBoundary
      FallbackComponent={
        fallback ? () => <>{fallback}</> : (props) => <ScreenErrorFallback {...props} screenName={screenName} />
      }
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
}
