import { useEffect, useState } from 'react';
import { Tabbar, MediaIcon, WalletIcon, Provider as UIProvider } from '@tg-app/ui';
import {
  bindMiniAppCSSVars,
  useMiniApp,
  useThemeParams,
  useViewport,
  bindThemeParamsCSSVars,
  bindViewportCSSVars,
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
  const miniApp = useMiniApp();
  const themeParams = useThemeParams();
  const viewport = useViewport();

  const [activeTab, setActiveTab] = useState(0);
  const Screen = tabs[activeTab].screen;

  useEffect(() => {
    bindMiniAppCSSVars(miniApp, themeParams);
    bindThemeParamsCSSVars(themeParams);

    if (viewport) {
      bindViewportCSSVars(viewport);
    }
  }, [miniApp, themeParams, viewport]);

  return (
    <UIProvider appearance={themeParams.isDark ? 'dark' : 'light'}>
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
