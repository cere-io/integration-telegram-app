import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { EmbedWallet, WalletEnvironment } from '@cere/embed-wallet';
import { useLaunchParams } from '@telegram-apps/sdk-react';
import { APP_ENV, TELEGRAM_BOT_ID } from '../constants.ts';

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

    wallet
      .init({
        appId: 'telegram-mini-app',
        env: APP_ENV as WalletEnvironment,
        authMethod: { type: 'telegram-mini-app', token: `${TELEGRAM_BOT_ID}:${initDataRaw}` },
      })
      .then(() => {
        wallet.isReady.then(() => {
          console.log('Cere Wallet initialised');
          wallet.connect().then(() => {
            console.log('Cere Wallet connected');
            wallet.getUserInfo().then((user) => {
              console.log('Cere Wallet details: ', user);
              document.getElementById('torusIframe').style.height = '0px';
            });
          });
        });
      });
    return wallet;
  }, [initDataRaw]);

  return <CereWalletContext.Provider value={wallet}>{children}</CereWalletContext.Provider>;
};
