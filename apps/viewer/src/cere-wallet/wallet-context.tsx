import { EmbedWallet, WalletEnvironment } from '@cere/embed-wallet';
import Analytics from '@tg-app/analytics';
import Reporting from '@tg-app/reporting';
import { createContext, PropsWithChildren, useContext, useMemo } from 'react';

import { APP_ENV, TELEGRAM_BOT_ID } from '../constants.ts';
import { isPreviewMode } from '../helpers';
import { useForceHideTorusIframe } from '../hooks';

const CereWalletContext = createContext<EmbedWallet | null>(null);

// Mock wallet for preview mode
const createMockWallet = (): Partial<EmbedWallet> =>
  ({
    init: () => Promise.resolve(),
    connect: () => Promise.resolve(),
    isReady: Promise.resolve(),
    isConnected: Promise.resolve(true),
    getSigner: () => ({
      getAddress: () => Promise.resolve('0x1234567890abcdef1234567890abcdef12345678'),
    }),
    getUserInfo: () =>
      Promise.resolve({
        name: 'Preview User',
        email: 'preview@example.com',
      }),
    naclBoxEdek: () => Promise.resolve('mock-edek'),
    subscribe: () => {
      return () => {};
    },
  }) as any;

export const useCereWallet = () => {
  const wallet = useContext(CereWalletContext);
  useForceHideTorusIframe();

  // Return mock wallet in preview mode
  if (isPreviewMode()) {
    return createMockWallet() as EmbedWallet;
  }

  if (!wallet) {
    throw new Error('Not in wallet context');
  }

  return wallet;
};

export const CereWalletProvider = ({ children }: PropsWithChildren<NonNullable<unknown>>) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const initDataRaw = window.Telegram?.WebApp?.initData || '';
  console.log('initData: ', initDataRaw);

  const wallet = useMemo(() => {
    // In preview mode, return null as we'll use mock wallet
    if (isPreviewMode()) {
      console.log('Preview mode detected - skipping wallet initialization');
      return null;
    }

    const wallet = new EmbedWallet({
      env: APP_ENV as WalletEnvironment,
    });

    const startTime = performance.now();

    const initWallet = async () => {
      try {
        Analytics.transaction('WALLET_INIT_STARTED', 0, { environment: APP_ENV });

        await wallet.init(
          initDataRaw
            ? {
                appId: 'telegram-mini-app',
                env: APP_ENV as WalletEnvironment,
                authMethod: { type: 'telegram-mini-app', token: `${TELEGRAM_BOT_ID}:${initDataRaw}` },
                mode: 'light',
              }
            : {
                appId: 'qa',
                env: APP_ENV as WalletEnvironment,
                connectOptions: {
                  permissions: {
                    ed25519_signRaw: {
                      title: 'Activity signing activity',
                      description:
                        'Allow the application to sign your activity before storing it into your data wallet.',
                    },
                  },
                },
                mode: 'light',
              },
        );

        await wallet.isReady;
        console.log('Cere Wallet initialised');

        await wallet.connect();
        console.log('Cere Wallet connected');

        // Hide Torus iframe
        const walletIframe = document.getElementById('torusIframe');
        if (walletIframe) {
          walletIframe.style.height = '0px';
        }

        const endTime = performance.now();
        const initialisationTime = endTime - startTime;
        console.log(`Cere Wallet initialisation time: ${initialisationTime.toFixed(2)} ms`);

        Analytics.transaction('WALLET_INITIALISED', initialisationTime, {
          environment: APP_ENV,
          hasInitData: !!initDataRaw,
        });
      } catch (error) {
        const endTime = performance.now();
        const failedInitTime = endTime - startTime;

        console.error('Cere Wallet initialization failed:', error);

        Analytics.exception('WALLET_INIT_FAILED', {
          error: error instanceof Error ? error.message : 'Unknown error',
          environment: APP_ENV,
          hasInitData: !!initDataRaw,
          failedAfter: failedInitTime,
        });

        Reporting.error(error, {
          captureContext: {
            extra: {
              hasInitData: !!initDataRaw,
              failedAfter: failedInitTime,
            },
            tags: {
              component: 'CereWalletProvider',
              phase: 'initialization',
              environment: APP_ENV,
            },
          },
        });

        throw error;
      }
    };

    initWallet();

    return wallet;
  }, [initDataRaw]);

  return <CereWalletContext.Provider value={wallet}>{children}</CereWalletContext.Provider>;
};
