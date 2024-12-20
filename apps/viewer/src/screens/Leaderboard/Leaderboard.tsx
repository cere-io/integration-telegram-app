import './Leaderboard.css';
import { Spinner } from '@tg-app/ui';
import { useEffect, useRef, useState } from 'react';
import { useStartParam, useEvents } from '../../hooks';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData } from '../../types';
import * as hbs from 'handlebars';
import Reporting from '@tg-app/reporting';
import { ENGAGEMENT_TIMEOUT_DURATION } from '../../constants.ts';
import { ActiveTab } from '~/App.tsx';

hbs.registerHelper('json', (context) => JSON.stringify(context));

type LeaderboardProps = {
  setActiveTab: (tab: ActiveTab) => void;
  tabbarHeight?: number;
};

export const Leaderboard = ({ setActiveTab, tabbarHeight }: LeaderboardProps) => {
  const [leaderboardHtml, setLeaderboardHtml] = useState<string>('');
  const [isLoading, setLoading] = useState(true);

  const { startParam } = useStartParam();
  const eventSource = useEvents();

  const activityStartTime = useRef<number | null>(null);

  console.log({ tabbarHeight });

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
            campaignId: startParam,
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
  }, [eventSource, startParam]);

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
    const handleIframeClick = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'LEADERBOARD_ROW_CLICK') {
        navigator.clipboard.writeText(event.data.publicKey);
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          <Spinner size="l" />
        </div>
      ) : (
        <iframe
          srcDoc={leaderboardHtml}
          style={{ width: '100%', height: 'calc(100vh - 50px)', border: 'none' }}
          title="Leaderboard"
        />
      )}
    </div>
  );
};
