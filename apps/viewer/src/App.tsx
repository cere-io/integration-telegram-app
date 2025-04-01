import './index.css';
import { useEffect, useState } from 'react';
import { AppRoot, Tabbar, MediaIcon, LeaderboardIcon, QuestsIcon, Text, Button } from '@tg-app/ui';
import Reporting from '@tg-app/reporting';
import { useInitData, useThemeParams } from '@vkruglikov/react-telegram-web-app';

import { Leaderboard, Media, ActiveQuests, WelcomeScreen, EngagementEventData } from './screens';

import '@telegram-apps/telegram-ui/dist/styles.css';
import { useEvents, useStartParam } from './hooks';
import hbs from 'handlebars';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { useCereWallet } from './cere-wallet';
import Analytics from '@tg-app/analytics';
import { useData } from './providers';

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
  const { campaignExpired, campaignPaused, debugMode } = useData();
  const [theme] = useThemeParams();
  const { campaignId, referrerId } = useStartParam();

  const cereWallet = useCereWallet();
  const eventSource = useEvents();
  const user = initDataUnsafe?.user;

  const [activeTab, setActiveTab] = useState<ActiveTab>({ index: 0 });
  const [isWelcomeScreenVisible, setWelcomeScreenVisible] = useState(true);
  const [notificationHtml, setNotificationHtml] = useState<string>('');

  const Screen = tabs[activeTab.index].screen;

  useEffect(() => {
    if (!user) {
      Reporting.clearUser();
      Analytics.clearUser();
    } else {
      Reporting.setUser({ id: user.id.toString(), username: user.username });
      Analytics.setUser({ id: user.id.toString(), username: user.username });
    }
    Analytics.setTags({ campaign_id: campaignId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!eventSource) return;

    const handleNotificationEvent = (event: any) => {
      if (
        (event?.payload && event.payload.integrationScriptResults[0].eventType === 'SEGMENT_WATCHED') ||
        (event?.payload && event.payload.integrationScriptResults[0].eventType === 'X_REPOST') ||
        (event?.payload && event.payload.integrationScriptResults[0].eventType === 'QUESTION_ANSWERED')
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

  useEffect(() => {
    if (!eventSource || !cereWallet) return;

    const sendJoinCampaignEvent = async () => {
      const accountId = await cereWallet.getSigner({ type: 'ed25519' }).getAddress();
      const userInfo = await cereWallet.getUserInfo();
      const campaignKey = `campaign:${accountId}:${campaignId}`;
      if (localStorage.getItem(campaignKey) === 'true') {
        return;
      }

      const payload: any = {
        campaign_id: campaignId,
      };
      if (referrerId) {
        payload.referrer_id = referrerId;
      }
      if (userInfo?.name) {
        payload.username = userInfo.name;
      }
      await eventSource.dispatchEvent(new ActivityEvent('JOIN_CAMPAIGN', payload));
      localStorage.setItem(campaignKey, 'true');
    };
    sendJoinCampaignEvent();
  }, [cereWallet, eventSource, campaignId, referrerId, user?.username]);

  const renderContent = () => {
    if (campaignExpired) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            textAlign: 'center',
            padding: '2rem',
          }}
        >
          <Text>Campaign Unavailable</Text>
          <Text>This campaign is no longer available or an error occurred.</Text>
        </div>
      );
    }
    if (campaignPaused) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            textAlign: 'center',
            padding: '2rem',
          }}
        >
          <Text>This campaign has been paused</Text>
          <Text>Please circle back late</Text>
        </div>
      );
    }
    return (
      <>
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
            {debugMode && (
              <Button
                style={{ position: 'absolute', right: '5px', top: '5px' }}
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  indexedDB.databases().then((dbs) => dbs.forEach((db) => indexedDB.deleteDatabase(db?.name || '')));
                }}
              >
                Clear cache
              </Button>
            )}

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
      </>
    );
  };

  return (
    <AppRoot appearance={theme} className="App-root" platform="ios" id="app-root">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        {renderContent()}
      </div>
    </AppRoot>
  );
};
