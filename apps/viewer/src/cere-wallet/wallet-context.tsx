import { createContext, PropsWithChildren, useContext, useState, useEffect } from 'react';
import { EmbedWallet, WalletEnvironment } from '@cere/embed-wallet';
import { APP_ENV, TELEGRAM_BOT_ID } from '../constants.ts';
import Analytics from '@tg-app/analytics';
import Reporting from '@tg-app/reporting';
import { useForceHideTorusIframe } from '../hooks';

interface CereWalletContextValue {
  wallet: EmbedWallet | null;
  error: Error | null;
  isInitializing: boolean;
}

const CereWalletContext = createContext<CereWalletContextValue>({
  wallet: null,
  error: null,
  isInitializing: true,
});

export const useCereWallet = () => {
  const { wallet, error, isInitializing } = useContext(CereWalletContext);
  useForceHideTorusIframe();

  if (!wallet && !isInitializing && !error) {
    throw new Error('Not in wallet context');
  }

  if (error) {
    throw error;
  }

  if (!wallet) {
    throw new Error('Wallet not initialized');
  }

  return wallet;
};

export const useCereWalletState = () => {
  return useContext(CereWalletContext);
};

export const CereWalletProvider = ({ children }: PropsWithChildren<NonNullable<unknown>>) => {
  const [walletState, setWalletState] = useState<CereWalletContextValue>({
    wallet: null,
    error: null,
    isInitializing: true,
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const initDataRaw = window.Telegram?.WebApp?.initData || '';
  console.log('initData: ', initDataRaw);

  useEffect(() => {
    let isMounted = true;
    const startTime = performance.now();

    const initializeWallet = async () => {
      try {
        const wallet = new EmbedWallet({
          env: APP_ENV as WalletEnvironment,
        });

        // Use the same config structure as the original code but with proper types
        const initConfig = initDataRaw
          ? {
              appId: 'telegram-mini-app',
              env: APP_ENV as WalletEnvironment,
              authMethod: { type: 'telegram-mini-app' as const, token: `${TELEGRAM_BOT_ID}:${initDataRaw}` },
              mode: 'light' as const,
            }
          : {
              appId: 'qa',
              env: APP_ENV as WalletEnvironment,
              connectOptions: {
                permissions: {
                  ed25519_signRaw: {
                    title: 'Activity signing activity',
                    description: 'Allow the application to sign your activity before storing it into your data wallet.',
                  },
                },
              },
              mode: 'light' as const,
            };

        // Initialize wallet with proper error handling
        await wallet.init(initConfig);
        console.log('Cere Wallet init complete');

        // Wait for wallet to be ready with timeout protection
        await Promise.race([
          wallet.isReady,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Wallet ready timeout')), 30000)),
        ]);
        console.log('Cere Wallet is ready');

        // Connect wallet with timeout protection
        await Promise.race([
          wallet.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Wallet connect timeout')), 30000)),
        ]);
        console.log('Cere Wallet connected');

        // Hide Torus iframe (UI improvement)
        const walletIframe = document.getElementById('torusIframe');
        if (walletIframe) {
          walletIframe.style.height = '0px';
        }

        const endTime = performance.now();
        const initialisationTime = endTime - startTime;
        console.log(`Cere Wallet initialisation time: ${initialisationTime.toFixed(2)} ms`);

        // Track successful initialization (same as original)
        Analytics.transaction('WALLET_INITIALISED', initialisationTime);

        // Report success to Sentry for monitoring
        Reporting.message(
          'Wallet initialized successfully',
          {
            context: 'wallet_initialization',
            initTime: initialisationTime,
            hasInitData: !!initDataRaw,
            environment: APP_ENV,
          },
          'info',
        );

        if (isMounted) {
          setWalletState({
            wallet,
            error: null,
            isInitializing: false,
          });
        }
      } catch (error) {
        const walletError = error instanceof Error ? error : new Error('Unknown wallet initialization error');

        console.error('Wallet initialization failed:', walletError);

        // Report detailed error to Sentry with context (NEW: comprehensive error reporting)
        Reporting.message(
          `Wallet initialization failed: ${walletError.message}`,
          {
            context: 'wallet_initialization_error',
            component: 'CereWalletProvider',
            hasInitData: !!initDataRaw,
            environment: APP_ENV,
            errorStack: walletError.stack || 'No stack trace',
            initTime: performance.now() - startTime,
          },
          'error',
        );

        // Track failed initialization (NEW: error analytics)
        Analytics.transaction('WALLET_INITIALIZATION_FAILED', performance.now() - startTime);

        if (isMounted) {
          setWalletState({
            wallet: null,
            error: walletError,
            isInitializing: false,
          });
        }
      }
    };

    initializeWallet();

    return () => {
      isMounted = false;
    };
  }, [initDataRaw]);

  return <CereWalletContext.Provider value={walletState}>{children}</CereWalletContext.Provider>;
};
