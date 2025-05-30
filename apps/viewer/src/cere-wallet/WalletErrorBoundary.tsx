import React from 'react';
import { Text, Button } from '@tg-app/ui';
import { ScreenErrorBoundary } from '../components/ScreenErrorBoundary';
import { useCereWalletState } from './wallet-context';

interface WalletErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function WalletErrorFallback({ error, resetErrorBoundary }: WalletErrorFallbackProps) {
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
        minHeight: '100vh',
        backgroundColor: 'var(--tg-theme-bg-color)',
      }}
    >
      <Text weight="2">Wallet Connection Failed</Text>
      <Text>Unable to initialize your wallet. Please try again.</Text>
      <Text weight="1" style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px' }}>
        Error: {error.message}
      </Text>
      <Button size="s" onClick={resetErrorBoundary}>
        Retry Connection
      </Button>
      <Button size="s" mode="plain" onClick={() => window.location.reload()}>
        Reload App
      </Button>
    </div>
  );
}

export function WalletErrorBoundary({ children }: { children: React.ReactNode }) {
  const { error, isInitializing } = useCereWalletState();

  // Show loading state while initializing (NEW: proper loading state)
  // TO DECIDE if we want this or add a spinner but bottom left logo is not always visible
  if (isInitializing) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <Text>Initializing wallet...</Text>
      </div>
    );
  }

  // Show error state if wallet initialization failed (NEW: dedicated wallet error handling)
  if (error) {
    return <WalletErrorFallback error={error} resetErrorBoundary={() => window.location.reload()} />;
  }

  // Wrap children in error boundary for runtime wallet errors
  return <ScreenErrorBoundary screenName="WalletProvider">{children}</ScreenErrorBoundary>;
}
