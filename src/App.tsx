import { useEffect, useState } from 'react';
import { Tabbar, MediaIcon, WalletIcon, Provider as UIProvider } from '@tg-app/ui';
import Reporting from '@tg-app/reporting';
import {
  bindMiniAppCSSVars,
  useMiniApp,
  useThemeParams,
  useViewport,
  bindThemeParamsCSSVars,
  bindViewportCSSVars,
  useInitData,
  useLaunchParams,
} from '@telegram-apps/sdk-react';

import { Media, Wallet } from './screens';

const tabs = [
  {
    icon: MediaIcon,
    screen: Media,
    text: 'Media catalog',
  },
  {
    icon: WalletIcon,
    screen: Wallet,
    text: 'Subscription info',
  },
];

export const App = () => {
  const launchParams = useLaunchParams();
  const miniApp = useMiniApp();
  const themeParams = useThemeParams();
  const viewport = useViewport();
  const { user } = useInitData() || {};

  const [activeTab, setActiveTab] = useState(0);
  const Screen = tabs[activeTab].screen;

  useEffect(() => {
    bindMiniAppCSSVars(miniApp, themeParams);
    bindThemeParamsCSSVars(themeParams);

    if (viewport) {
      bindViewportCSSVars(viewport);
    }
  }, [miniApp, themeParams, viewport]);

  useEffect(
    () => (!user ? Reporting.clearUser() : Reporting.setUser({ id: user.id.toString(), username: user.username })),
    [user],
  );

  return (
    <UIProvider
      appearance={miniApp.isDark ? 'dark' : 'light'}
      platform={['macos', 'ios'].includes(launchParams.platform) ? 'ios' : 'base'}
    >
      <Screen setActiveTab={setActiveTab} />

      <Tabbar>
        {tabs.map(({ icon: Icon, text }, index) => (
          <Tabbar.Item key={index} text={text} selected={activeTab === index} onClick={() => setActiveTab(index)}>
            <Icon size={26} style={{ margin: 2 }} />
          </Tabbar.Item>
        ))}
      </Tabbar>
    </UIProvider>
  );
};
