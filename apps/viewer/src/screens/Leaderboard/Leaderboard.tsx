import './Leaderboard.css';
import { Snackbar, Loader, truncateText } from '@tg-app/ui';
import { useEffect, useRef, useState } from 'react';
import { useStartParam, useEvents, useEventQueue } from '../../hooks';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData } from '../../types';
import * as hbs from 'handlebars';
import Reporting from '@tg-app/reporting';
import { ENGAGEMENT_TIMEOUT_DURATION } from '../../constants.ts';
import { ActiveTab } from '~/App.tsx';
import { ClipboardCheck } from 'lucide-react';
import { useThemeParams } from '@vkruglikov/react-telegram-web-app';
import { decodeHtml } from '../../helpers';
import { useData } from '../../providers';

hbs.registerHelper('json', (context) => JSON.stringify(context));

type LeaderboardProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

export const Leaderboard = ({ setActiveTab }: LeaderboardProps) => {
  const { leaderboardHtml, updateData } = useData();
  const { addToQueue } = useEventQueue();

  const [isLoading, setLoading] = useState(leaderboardHtml === '');
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const [theme] = useThemeParams();
  const { campaignId } = useStartParam();
  const eventSource = useEvents();

  const isFetching = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const activityStartTime = useRef<number | null>(null);

  useEffect(() => {
    if (!eventSource || isFetching.current) return;

    isFetching.current = true;

    const fetchData = async () => {
      try {
        setLoading(true);

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

        addToQueue(event);
      } catch (error) {
        console.error('Error dispatching event:', error);
      }
    };

    fetchData();
    return () => {
      isFetching.current = false;
    };
  }, [eventSource]);

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
        const decodedHTML = decodeHtml(compiledHTML);

        updateData(integrationScriptResults, decodedHTML, 'leaderboard');

        if (iframeRef.current) {
          const eventData = {
            type: 'LEADERBOARD_UPDATE',
            payload: (integrationScriptResults as Array<any>)?.[0].users,
          };

          iframeRef.current.contentWindow?.postMessage(eventData, '*');
        }

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
  }, [eventSource, updateData]);

  useEffect(() => {
    const handleIframeClick = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'LEADERBOARD_ROW_CLICK') {
        const publicKey = event.data.publicKey;

        try {
          const tempInput = document.createElement('textarea');
          tempInput.value = publicKey;
          document.body.appendChild(tempInput);
          tempInput.select();

          if (document.execCommand('copy')) {
            setSnackbarMessage(
              `Public key ${truncateText({ text: publicKey, maxLength: 12 })} copied to clipboard successfully!`,
            );
          } else {
            setSnackbarMessage(
              `Failed to copy the public key. Please copy manually: ${truncateText({ text: publicKey, maxLength: 12 })}`,
            );
          }

          document.body.removeChild(tempInput);
        } catch (error) {
          console.error('Failed to copy the public key:', error);
          setSnackbarMessage(
            `Clipboard is not supported. Public key: ${truncateText({ text: publicKey, maxLength: 12 })}.`,
          );
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
          ref={iframeRef}
          allow="clipboard-read; clipboard-write"
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
