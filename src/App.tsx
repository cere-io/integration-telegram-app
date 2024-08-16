import { useEffect, useState } from 'react';
import { Tabbar, MediaIcon, WalletIcon, Provider as UIProvider } from '@tg-app/ui';
import {
  useLaunchParams,
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
    text: 'Media',
  },
  {
    icon: WalletIcon,
    screen: Wallet,
    text: 'Wallet',
  },
];

export const App = () => {
  const { platform } = useLaunchParams();
  const miniApp = useMiniApp();
  const themeParams = useThemeParams();
  const viewport = useViewport();

  console.log('App Start', { platform, miniApp, themeParams, viewport });

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
    <UIProvider>
      <Screen />

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
