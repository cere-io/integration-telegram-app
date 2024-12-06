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

  const wallet = useMemo(() => {
    const wallet = new EmbedWallet({
      env: APP_ENV as WalletEnvironment,
    });

    wallet
      .init({
        appId: 'telegram-mini-app',
        env: APP_ENV as WalletEnvironment,
        authMethod: {
          type: 'telegram-mini-app',
          token: `${TELEGRAM_BOT_ID}:user=%7B%22id%22%3A574080820%2C%22first_name%22%3A%22Anton%22%2C%22last_name%22%3A%22Mazhuto%22%2C%22username%22%3A%22mazhutoanton%22%2C%22language_code%22%3A%22ru%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2FLCQMUjSqa3x4noW2L69FkVcKzva7Bq9w8Lyq8HMz9Bs.svg%22%7D&chat_instance=-2309005376011590234&chat_type=sender&start_param=-1002217385177&auth_date=1733490487&signature=MtrSN2bJk4LL3zI341BpdpYo2G8fEM4oo-TguZzmpy_iwq8ufEcU46JIbQ8iTRzhd88p-geInRTVL3KlRIX-Cw&hash=7f5624066a70db66e5e29265e2074bef268b44f7c52600ef9759cd296c6a99c0`,
        },
      })
      .then(() => {
        wallet.isReady.then(() => {
          console.log('Cere Wallet initialised');
          wallet.connect().then(() => {
            console.log('Cere Wallet connected');
            wallet.getUserInfo().then((user) => {
              console.log('Cere Wallet details: ', user);
            });
          });
        });
      });
    return wallet;
  }, [initDataRaw]);

  return <CereWalletContext.Provider value={wallet}>{children}</CereWalletContext.Provider>;
};
