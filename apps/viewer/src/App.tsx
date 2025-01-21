import './index.css';
import { useEffect, useState } from 'react';
import { AppRoot, Tabbar, MediaIcon, LeaderboardIcon, QuestsIcon } from '@tg-app/ui';
import Reporting from '@tg-app/reporting';
import { useInitData, useThemeParams } from '@vkruglikov/react-telegram-web-app';

import { Leaderboard, Media, ActiveQuests, WelcomeScreen, EngagementEventData } from './screens';

import '@telegram-apps/telegram-ui/dist/styles.css';
import { useEvents } from './hooks';
import hbs from 'handlebars';

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
  const [initDataUnsafe] = useInitData() || {};
  const [theme] = useThemeParams();
  const eventSource = useEvents();
  const user = initDataUnsafe?.user;

  const [activeTab, setActiveTab] = useState<ActiveTab>({ index: 0 });
  const [isWelcomeScreenVisible, setWelcomeScreenVisible] = useState(true);
  const [notificationHtml, setNotificationHtml] = useState<string>('');

  const Screen = tabs[activeTab.index].screen;

  useEffect(
    () => (!user ? Reporting.clearUser() : Reporting.setUser({ id: user.id.toString(), username: user.username })),
    [user],
  );

  useEffect(() => {
    if (!eventSource) return;

    const handleNotificationEvent = (event: any) => {
      if (
        (event?.payload && event.payload.integrationScriptResults[0].eventType === 'SEGMENT_WATCHED') ||
        (event?.payload && event.payload.integrationScriptResults[0].eventType === 'X_REPOST')
      ) {
        const { engagement, integrationScriptResults }: EngagementEventData = event.payload;
        const { widget_template } = engagement;

        (integrationScriptResults as Array<any>)[0].duration = 10000;

        const compiledHTML = hbs.compile(widget_template.params || '')({
          data: integrationScriptResults,
        });

        setNotificationHtml(compiledHTML);
      }
    };
    eventSource.addEventListener('engagement', handleNotificationEvent);

    return () => {
      eventSource.removeEventListener('engagement', handleNotificationEvent);
    };
  }, [eventSource]);

  return (
    <AppRoot appearance={theme} className="App-root" platform="ios" id="app-root">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        {notificationHtml && (
          <iframe
            srcDoc={notificationHtml}
            style={{
              zIndex: '1000',
              position: 'fixed',
              right: 0,
              width: '100%',
              border: 'none',
            }}
            title="Notification"
          />
        )}
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
