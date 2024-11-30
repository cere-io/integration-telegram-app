import { useEffect, useState } from 'react';
import { Tabbar, MediaIcon, Provider as UIProvider, SubscriptionIcon } from '@tg-app/ui';
import Reporting from '@tg-app/reporting';
import {
  bindMiniAppCSSVars,
  useMiniApp,
  useThemeParams,
  useViewport,
  bindThemeParamsCSSVars,
  bindViewportCSSVars,
  useInitData,
} from '@telegram-apps/sdk-react';

import { Leaderboard, Media, Wallet } from './screens';

const tabs = [
  {
    icon: MediaIcon,
    screen: Media,
    text: 'Library',
  },
  {
    icon: SubscriptionIcon,
    screen: Wallet,
    text: 'Subscription info',
  },
  {
    icon: LeaderboardIcon,
    screen: Leaderboard,
    text: 'Leaderboard',
  },
];

export type ActiveTab = {
  index: number;
  props?: Record<string, unknown>;
};

export const App = () => {
  const miniApp = useMiniApp();
  const themeParams = useThemeParams();
  const viewport = useViewport();
  const { user } = useInitData() || {};

  const [activeTab, setActiveTab] = useState<ActiveTab>({ index: 0 });
  const Screen = tabs[activeTab.index].screen;

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
    <UIProvider appearance={miniApp.isDark ? 'dark' : 'light'}>
      <Screen setActiveTab={setActiveTab} {...activeTab.props} />

      <Tabbar>
        {tabs.map(({ icon: Icon, text }, index) => (
          <Tabbar.Item
            key={index}
            text={text}
            selected={activeTab.index === index}
            onClick={() => setActiveTab({ index })}
          >
            <Icon style={{ margin: 2, fontSize: 28 }} />
          </Tabbar.Item>
        ))}
      </Tabbar>
    </UIProvider>
  );
};
