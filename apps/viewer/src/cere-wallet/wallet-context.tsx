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
          token: `${TELEGRAM_BOT_ID}:user%3D%257B%2522id%2522%253A574080820%252C%2522first_name%2522%253A%2522Anton%2522%252C%2522last_name%2522%253A%2522Mazhuto%2522%252C%2522username%2522%253A%2522mazhutoanton%2522%252C%2522language_code%2522%253A%2522ru%2522%252C%2522allows_write_to_pm%2522%253Atrue%252C%2522photo_url%2522%253A%2522https%253A%255C%252F%255C%252Ft.me%255C%252Fi%255C%252Fuserpic%255C%252F320%255C%252FLCQMUjSqa3x4noW2L69FkVcKzva7Bq9w8Lyq8HMz9Bs.svg%2522%257D%26chat_instance%3D-2883552631739853331%26chat_type%3Dprivate%26start_param%3D-1002217385177%26auth_date%3D1733779821%26signature%3DPKfj5CI-FCAKgsyddCih8GP3ZeSuCV0MRZk_1r2nz_xDx9337BKZJtNmWKr3Zf0J6QE95imCDKuQeQbPzL_eBw%26hash%3D982cc7133588e7a12300b044b57f2244f981c3c89e9944f2fb7c24d3a03dabc0&tgWebAppVersion=8.0&tgWebAppPlatform=macos&tgWebAppThemeParams=%7B%22button_text_color%22%3A%22%23ffffff%22%2C%22secondary_bg_color%22%3A%22%23131415%22%2C%22hint_color%22%3A%22%23b1c3d5%22%2C%22section_bg_color%22%3A%22%2318222d%22%2C%22button_color%22%3A%22%232ea6ff%22%2C%22destructive_text_color%22%3A%22%23ef5b5b%22%2C%22accent_text_color%22%3A%22%232ea6ff%22%2C%22bottom_bar_bg_color%22%3A%22%23213040%22%2C%22section_header_text_color%22%3A%22%23b1c3d5%22%2C%22bg_color%22%3A%22%2318222d%22%2C%22section_separator_color%22%3A%22%23213040%22%2C%22subtitle_text_color%22%3A%22%23b1c3d5%22%2C%22link_color%22%3A%22%2362bcf9%22%2C%22header_bg_color%22%3A%22%23131415%22%2C%22text_color%22%3A%22%23ffffff%22%7D`,
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
