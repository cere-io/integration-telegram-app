import './index.css';
import { useEffect, useState } from 'react';
import { AppRoot, Tabbar, MediaIcon, LeaderboardIcon, QuestsIcon } from '@tg-app/ui';
import Reporting from '@tg-app/reporting';
import { useInitData, useWebApp } from '@vkruglikov/react-telegram-web-app';

import { Leaderboard, Media, ActiveQuests, WelcomeScreen } from './screens';

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
  const miniApp = useWebApp();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [initDataUnsafe] = useInitData() || {};
  const user = initDataUnsafe?.user;

  useEffect(() => {
    const handleThemeChange = () => {
      const themeParams = miniApp.themeParams;
      const isDarkTheme = themeParams?.is_dark;
      setTheme(isDarkTheme ? 'dark' : 'light');
    };
    miniApp.onEvent('themeChanged', handleThemeChange);
    handleThemeChange();
    return () => {
      miniApp.offEvent('themeChanged', handleThemeChange);
    };
  }, [miniApp]);

  const [activeTab, setActiveTab] = useState<ActiveTab>({ index: 0 });
  const [isWelcomeScreenVisible, setWelcomeScreenVisible] = useState(true);

  const Screen = tabs[activeTab.index].screen;

  useEffect(
    () => (!user ? Reporting.clearUser() : Reporting.setUser({ id: user.id.toString(), username: user.username })),
    [user],
  );

  return (
    <AppRoot appearance={theme} className="App-root" platform="ios" id="app-root">
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
