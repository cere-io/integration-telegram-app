import { Loader, Snackbar } from '@tg-app/ui';
import { useEventQueue, useEvents, useStartParam } from '../../hooks';
import { useEffect, useRef, useState } from 'react';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData } from '~/types';
import hbs from 'handlebars';
import Reporting from '@tg-app/reporting';
import { ENGAGEMENT_TIMEOUT_DURATION, TELEGRAM_APP_URL } from '../../constants.ts';
import { ActiveTab } from '~/App.tsx';
import { useThemeParams } from '@vkruglikov/react-telegram-web-app';
import { ClipboardCheck } from 'lucide-react';
import { useCereWallet } from '../../cere-wallet';
import { decodeHtml } from '../../helpers';
import { useData } from '../../providers';

hbs.registerHelper('json', (context) => JSON.stringify(context));

type ActiveQuestsProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

export const ActiveQuests = ({ setActiveTab }: ActiveQuestsProps) => {
  const { questsHtml, updateData } = useData();
  const { addToQueue } = useEventQueue();
  const [preparingData, setPreparingData] = useState<boolean>(questsHtml === '');
  const [loading, setLoading] = useState(true);
  // const [questsHtml, setQuestsHtml] = useState<string>('');
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const eventSource = useEvents();
  const { campaignId } = useStartParam();
  const cereWallet = useCereWallet();

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [theme] = useThemeParams();

  const appStartTime = useRef<number>(performance.now());
  const activityStartTime = useRef<number | null>(null);

  useEffect(() => {
    if (!loading) {
      const loadTime = performance.now() - appStartTime.current;
      Reporting.message(`App loaded: ${loadTime.toFixed(2)}`, {
        level: 'info',
        contexts: {
          loadTime: {
            duration: loadTime,
            unit: 'ms',
          },
        },
      });
    }
  }, [loading]);

  useEffect(() => {
    const handleIframeClick = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'VIDEO_QUEST_CLICK') {
        setActiveTab({
          index: 2,
          props: {
            videoUrl: event.data.videoUrl,
          },
        });
      }
      const accountId = await cereWallet.getSigner({ type: 'ed25519' }).getAddress();
      const invitationLink = `${TELEGRAM_APP_URL}?startapp=${campaignId}_${accountId}`;
      if (event.data.type === 'REFERRAL_LINK_CLICK') {
        navigator.clipboard.writeText(invitationLink);
        setSnackbarMessage('Invitation link copied  to clipboard successfully!');
      }

      if (event.data.type === 'REFERRAL_BUTTON_CLICK') {
        const text =
          'Hey there, friend! 🎉 I’m excited to invite you to join the Watch-to-Earn campaign where you can earn amazing prizes just by watching! Don’t miss out on this fantastic opportunity to have fun and win big. Ready to jump in? Click the link above to get started and let’s make this an unforgettable experience together! 🌟';
        window.open(`https://t.me/share/url?url=${invitationLink}&text=${text}`);
      }
    };

    window.addEventListener('message', handleIframeClick);

    return () => {
      window.removeEventListener('message', handleIframeClick);
    };
  }, [campaignId, cereWallet, setActiveTab]);

  useEffect(() => {
    if (!eventSource) return;

    const getQuests = async () => {
      activityStartTime.current = performance.now();

      const { event_type, timestamp, data } = {
        event_type: 'GET_QUESTS',
        timestamp: new Date().toISOString(),
        data: JSON.stringify({
          campaignId: campaignId,
          campaign_id: campaignId,
          theme,
        }),
      };

      const parsedData = JSON.parse(data);
      const event = new ActivityEvent(event_type, {
        ...parsedData,
        timestamp,
      });

      addToQueue(event);
    };

    getQuests();
  }, [campaignId, theme]);

  useEffect(() => {
    // eslint-disable-next-line prefer-const
    let engagementTimeout: NodeJS.Timeout;
    if (!eventSource) return;
    const handleEngagementEvent = (event: any) => {
      clearTimeout(engagementTimeout);
      if (event?.payload && event.payload.integrationScriptResults[0].eventType === 'GET_QUESTS') {
        const engagementTime = performance.now() - (activityStartTime.current || 0);

        console.log(`Active Quests Engagement Loaded: ${engagementTime}ms`);

        Reporting.message(`Active Quests Engagement Loaded: ${engagementTime}`, {
          level: 'info',
          contexts: {
            engagementTime: {
              duration: engagementTime,
              unit: 'ms',
            },
          },
        });

        const { engagement, integrationScriptResults }: EngagementEventData = event.payload;
        const { widget_template } = engagement;

        const compiledHTML = hbs.compile(widget_template.params || '')({ data: integrationScriptResults });

        const decodedHTML = decodeHtml(compiledHTML);

        updateData(integrationScriptResults, decodedHTML, 'quest');

        if (iframeRef.current) {
          const eventData = {
            type: 'QUESTS_UPDATE',
            payload: (integrationScriptResults as Array<any>)?.[0].quests,
          };

          iframeRef.current.contentWindow?.postMessage(eventData, '*');
        }
        setTimeout(() => {
          setPreparingData(false);
          setLoading(false);
        }, 0);
      }
    };

    engagementTimeout = setTimeout(() => {
      const timeoutDuration = ENGAGEMENT_TIMEOUT_DURATION;
      console.error(`Active Quests Engagement Timeout after ${timeoutDuration}ms`);

      Reporting.message('Active Quests Engagement Failed', {
        level: 'error',
        contexts: {
          timeout: {
            duration: timeoutDuration,
            unit: 'ms',
          },
        },
      });
    }, ENGAGEMENT_TIMEOUT_DURATION);

    eventSource.addEventListener('engagement', handleEngagementEvent);

    return () => {
      clearTimeout(engagementTimeout);
      eventSource.removeEventListener('engagement', handleEngagementEvent);
    };
  }, [eventSource, updateData]);

  useEffect(() => {
    const handleIframeClick = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'SOCIAL_QUEST_CLICKED') {
        if (!eventSource) return;

        const { event_type, timestamp, data } = {
          event_type: 'X_REPOST_STARTED',
          timestamp: new Date().toISOString(),
          data: JSON.stringify({
            campaignId: campaignId,
            campaign_id: campaignId,
            tweet_id_original: event.data.tweetId,
            theme,
          }),
        };
        const parsedData = JSON.parse(data);

        const activityEvent = new ActivityEvent(event_type, {
          ...parsedData,
          timestamp,
        });

        void eventSource.dispatchEvent(activityEvent);
      }
    };
    window.addEventListener('message', handleIframeClick);

    return () => {
      window.removeEventListener('message', handleIframeClick);
    };
  }, [eventSource, campaignId, theme]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {preparingData ? (
        <Loader size="m" />
      ) : (
        <iframe
          ref={iframeRef}
          srcDoc={questsHtml}
          style={{
            width: '100%',
            height: 'calc(100vh - 74px)',
            border: 'none',
          }}
          title="Active Quests"
        />
      )}
      {snackbarMessage && (
        <Snackbar onClose={() => setSnackbarMessage(null)} duration={5000}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardCheck />
            {snackbarMessage}
          </div>
        </Snackbar>
      )}
    </div>
  );
};
