import './index.css';
import '@telegram-apps/telegram-ui/dist/styles.css';

import { ActivityEvent } from '@cere-activity-sdk/events';
import Analytics from '@tg-app/analytics';
import Reporting from '@tg-app/reporting';
import { AppRoot, Button, LeaderboardIcon, MediaIcon, QuestsIcon, Tabbar, Text } from '@tg-app/ui';
import { useInitData, useThemeParams } from '@vkruglikov/react-telegram-web-app';
import { useEffect, useState } from 'react';

import { useCereWallet } from './cere-wallet';
import { applyPreviewCustomization, compileHtml, getPreviewCustomization, isPreviewMode } from './helpers';
import { useEvents, useStartParam } from './hooks';
import { useData } from './providers';
import { ActiveQuests, Leaderboard, Media, WelcomeScreen } from './screens';

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
  const {
    campaignExpired,
    campaignPaused,
    debugMode,
    activeCampaignId,
    refetchQuestsForTab,
    refetchLeaderboardForTab,
  } = useData();
  const [theme] = useThemeParams();
  const { organizationId, campaignId, referrerId } = useStartParam();

  const cereWallet = useCereWallet();
  const eventSource = useEvents();
  const user = initDataUnsafe?.user;

  const [activeTab, setActiveTab] = useState<ActiveTab>({ index: 0 });
  const [isWelcomeScreenVisible, setWelcomeScreenVisible] = useState(true);
  const [notificationHtml, setNotificationHtml] = useState<string>('');

  const Screen = tabs[activeTab.index].screen;

  // Handle tab change and trigger refetch for specific tabs
  const handleTabChange = (newTab: ActiveTab) => {
    setActiveTab(newTab);

    // Trigger refetch when switching to specific tabs
    if (newTab.index === 0) {
      // ActiveQuests tab
      refetchQuestsForTab();
    } else if (newTab.index === 1) {
      // Leaderboard tab
      refetchLeaderboardForTab();
    }
  };

  // Apply preview customization if in preview mode
  useEffect(() => {
    const previewCustomization = getPreviewCustomization();
    if (previewCustomization) {
      applyPreviewCustomization(previewCustomization);
    }
  }, []);

  useEffect(() => {
    // Skip analytics in preview mode
    if (isPreviewMode()) {
      console.log('Preview mode detected - skipping analytics initialization');
      return;
    }

    if (!user) {
      Reporting.clearUser();
      Analytics.clearUser();
    } else {
      Reporting.setUser({ id: user.id.toString(), username: user.username });
      Analytics.setUser({ id: user.id.toString(), username: user.username });
    }
    Analytics.setTags({ organization_id: organizationId, campaign_id: campaignId || activeCampaignId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!eventSource) return;

    const handleNotificationEvent = (event: any) => {
      if (
        (event?.payload && event.payload.integrationScriptResults[0].data.eventType === 'SEGMENT_WATCHED') ||
        (event?.payload && event.payload.integrationScriptResults[0].data.eventType === 'X_REPOST') ||
        (event?.payload && event.payload.integrationScriptResults[0].data.eventType === 'QUESTION_ANSWERED')
      ) {
        const results = event?.payload?.integrationScriptResults;
        const result = results[0];
        const { data, htmlTemplate } = result;
        data.duration = 10000;
        const compiledHTML = compileHtml(htmlTemplate, [data]);
        setNotificationHtml(compiledHTML);
      }
    };
    eventSource.addEventListener('engagement', handleNotificationEvent);

    return () => {
      eventSource.removeEventListener('engagement', handleNotificationEvent);
    };
  }, [eventSource]);

  useEffect(() => {
    // Skip join campaign event in preview mode
    if (isPreviewMode()) {
      console.log('Preview mode detected - skipping join campaign event');
      return;
    }

    if (!eventSource || !cereWallet) return;

    const sendJoinCampaignEvent = async () => {
      const accountId = await cereWallet.getSigner({ type: 'ed25519' }).getAddress();
      const userInfo = await cereWallet.getUserInfo();
      const campaignKeyParts = ['campaign', accountId, campaignId || activeCampaignId];
      if (organizationId) {
        campaignKeyParts.push(organizationId);
      }

      const campaignKey = campaignKeyParts.join(':');
      if (localStorage.getItem(campaignKey) === 'true') {
        return;
      }

      const payload: any = {
        organization_id: organizationId,
        campaign_id: campaignId || activeCampaignId,
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
  }, [cereWallet, eventSource, campaignId, referrerId, user?.username, activeCampaignId, organizationId]);

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
                  window.location.reload();
                }}
              >
                Clear cache
              </Button>
            )}

            <Screen setActiveTab={handleTabChange} {...activeTab.props} />

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
                  onClick={() => handleTabChange({ index })}
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
          height: 'calc(100vh - env(safe-area-inset-bottom))',
        }}
      >
        {renderContent()}
      </div>
    </AppRoot>
  );
};
