import './Leaderboard.css';
import { Snackbar, Loader, truncateText } from '@tg-app/ui';
import { useEffect, useRef, useState } from 'react';
import { useStartParam, useEvents } from '../../hooks';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData } from '../../types';
import * as hbs from 'handlebars';
import Reporting from '@tg-app/reporting';
import { ENGAGEMENT_TIMEOUT_DURATION } from '../../constants.ts';
import { ActiveTab } from '~/App.tsx';
import { ClipboardCheck } from 'lucide-react';
import { useThemeParams } from '@vkruglikov/react-telegram-web-app';

hbs.registerHelper('json', (context) => JSON.stringify(context));

type LeaderboardProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

export const Leaderboard = ({ setActiveTab }: LeaderboardProps) => {
  const [leaderboardHtml, setLeaderboardHtml] = useState<string>('');
  const [isLoading, setLoading] = useState(true);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const [theme] = useThemeParams();
  const { campaignId } = useStartParam();
  const eventSource = useEvents();

  const activityStartTime = useRef<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (!eventSource) return;

        activityStartTime.current = performance.now();

        const { event_type, timestamp, data } = {
          event_type: 'GET_LEADERBOARD',
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

        await eventSource.dispatchEvent(event);
      } catch (error) {
        console.error('Error dispatching event:', error);
      }
    };

    fetchData();
  }, [eventSource, campaignId, theme]);

  useEffect(() => {
    // eslint-disable-next-line prefer-const
    let engagementTimeout: NodeJS.Timeout;

    if (!eventSource) return;

    const handleEngagementEvent = (event: any) => {
      clearTimeout(engagementTimeout);
      if (event?.payload && event.payload.integrationScriptResults[0].eventType === 'GET_LEADERBOARD') {
        const engagementTime = performance.now() - (activityStartTime.current || 0);
        console.log(`Leaderboard Engagement Time: ${engagementTime}ms`);

        Reporting.message(`Leaderboard Engagement Loaded: ${engagementTime}`, {
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
        setLeaderboardHtml(compiledHTML);

        setTimeout(() => setLoading(false), 0);
      }
    };

    engagementTimeout = setTimeout(() => {
      const timeoutDuration = ENGAGEMENT_TIMEOUT_DURATION;
      console.error(`Leaderboard Engagement Timeout after ${timeoutDuration}ms`);

      Reporting.message('Leaderboard Engagement Failed', {
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
  }, [eventSource]);

  useEffect(() => {
    const handleIframeClick = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'LEADERBOARD_ROW_CLICK') {
        const publicKey = event.data.publicKey;

        try {
          await navigator.clipboard.writeText(publicKey);
          setSnackbarMessage(
            `Public key ${truncateText({ text: publicKey, maxLength: 12 })} copied to clipboard successfully!`,
          );
        } catch (error) {
          console.error('Failed to copy the public key:', error);
          setSnackbarMessage('Failed to copy the public key. Please try again.');
        }
      }

      if (event.data.type === 'VIDEO_QUEST_CLICK') {
        setActiveTab({
          index: 2,
          props: {
            videoUrl: event.data.videoUrl,
          },
        });
      }
      if (event.data.type === 'QUEST_CLICKED') {
        setActiveTab({
          index: 0,
        });
      }
    };
    window.addEventListener('message', handleIframeClick);

    return () => {
      window.removeEventListener('message', handleIframeClick);
    };
  }, [setActiveTab]);

  return (
    <div className="leaderboard" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {isLoading ? (
        <Loader size="m" />
      ) : (
        <iframe
          srcDoc={leaderboardHtml}
          style={{ width: '100%', height: 'calc(100vh - 75px)', border: 'none' }}
          title="Leaderboard"
        />
      )}
      {snackbarMessage && (
        <Snackbar onClose={() => setSnackbarMessage(null)} duration={5000}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <ClipboardCheck />
            {snackbarMessage}
          </div>
        </Snackbar>
      )}
    </div>
  );
};
