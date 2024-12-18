import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { EmbedWallet, WalletEnvironment } from '@cere/embed-wallet';
import { useLaunchParams } from '@telegram-apps/sdk-react';
import { APP_ENV, TELEGRAM_BOT_ID } from '../constants.ts';
import Reporting from '@tg-app/reporting';

const CereWalletContext = createContext<EmbedWallet | null>(null);

export const useCereWallet = () => {
  const wallet = useContext(CereWalletContext);

  if (!wallet) {
    throw new Error('Not in wallet context');
  }

  return wallet;
};

export const CereWalletProvider = ({ children }: PropsWithChildren<NonNullable<unknown>>) => {
  const { initDataRaw } = useLaunchParams() || {};
  console.log('initData: ', initDataRaw);

  const wallet = useMemo(() => {
    const wallet = new EmbedWallet({
      env: APP_ENV as WalletEnvironment,
    });

    const startTime = performance.now();

    wallet
      .init(
        initDataRaw
          ? {
              appId: 'telegram-mini-app',
              env: APP_ENV as WalletEnvironment,
              authMethod: { type: 'telegram-mini-app', token: `${TELEGRAM_BOT_ID}:${initDataRaw}` },
            }
          : {
              appId: 'viewer-app',
              env: APP_ENV as WalletEnvironment,
            },
      )
      .then(() => {
        wallet.isReady.then(() => {
          console.log('Cere Wallet initialised');
          wallet.connect().then(() => {
            console.log('Cere Wallet connected');

            const endTime = performance.now();
            const initialisationTime = endTime - startTime;
            console.log(`Cere Wallet initialisation time: ${initialisationTime.toFixed(2)} ms`);
            Reporting.message(`Cere Wallet Initialised: ${initialisationTime.toFixed(2)}`, {
              level: 'info',
              tags: {
                environment: APP_ENV as WalletEnvironment,
                wallet: 'Cere Wallet',
              },
              context: {
                performance: {
                  initialisationTime: `${initialisationTime.toFixed(2)}`,
                },
              },
            });

            wallet.getUserInfo().then((user) => {
              console.log('Cere Wallet details: ', user);
              const walletIframe = document.getElementById('torusIframe');
              if (walletIframe) {
                walletIframe.style.height = '0px';
              }
            });
          });
        });
      });
    return wallet;
  }, [initDataRaw]);

  return <CereWalletContext.Provider value={wallet}>{children}</CereWalletContext.Provider>;
};
