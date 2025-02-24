import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { EmbedWallet, WalletEnvironment } from '@cere/embed-wallet';
import { APP_ENV, TELEGRAM_BOT_ID } from '../constants.ts';
import Reporting from '@tg-app/reporting';
import Analytics, { AnalyticsId } from '@tg-app/analytics';
import { useHideTorusIframe } from '../hooks';

const CereWalletContext = createContext<EmbedWallet | null>(null);

export const useCereWallet = () => {
  const wallet = useContext(CereWalletContext);
  useHideTorusIframe();

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
              mode: 'light',
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
              mode: 'light',
            },
      )
      .then(() => {
        wallet.isReady.then(() => {
          console.log('Cere Wallet initialised');
          wallet.connect().then(() => {
            console.log('Cere Wallet connected');

            const walletIframe = document.getElementById('torusIframe');
            if (walletIframe) {
              walletIframe.style.height = '0px';
            }

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
              if (user.isNewWallet) {
                Analytics.trackEvent(AnalyticsId.cereWalletCreated);
              }
              console.log('Cere Wallet details: ', user);
            });
          });
        });
      });
    return wallet;
  }, [initDataRaw]);

  return <CereWalletContext.Provider value={wallet}>{children}</CereWalletContext.Provider>;
};
