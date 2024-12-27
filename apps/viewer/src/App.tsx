import './index.css';
import { useEffect, useState } from 'react';
import { Tabbar, MediaIcon, LeaderboardIcon, QuestsIcon } from '@tg-app/ui';
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

import { Leaderboard, Media, ActiveQuests, WelcomeScreen } from './screens';

import { AppRoot } from '@telegram-apps/telegram-ui';
import '@telegram-apps/telegram-ui/dist/styles.css';

const tabs = [
  {
    icon: QuestsIcon,
    screen: ActiveQuests,
    text: 'Active Quests',
  },
  {
    icon: LeaderboardIcon,
    screen: Leaderboard,
    text: 'Leaderboard',
  },
  {
    icon: MediaIcon,
    screen: Media,
    text: 'Library',
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
  const [isWelcomeScreenVisible, setWelcomeScreenVisible] = useState(true);

  const platform = window.location.hostname === 'web.telegram.org' ? 'base' : 'ios';

  const finalPlatform = platform === 'ios' || platform === 'base' ? platform : 'base';

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
    <AppRoot appearance={miniApp.isDark ? 'dark' : 'light'} className="App-root" platform={finalPlatform} id="app-root">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        {isWelcomeScreenVisible ? (
          <WelcomeScreen onStart={() => setWelcomeScreenVisible(false)} />
        ) : (
          <>
            <Screen setActiveTab={setActiveTab} {...activeTab.props} />

            <Tabbar
              style={{
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 13px)',
              }}
            >
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
          </>
        )}
      </div>
    </AppRoot>
  );
};
