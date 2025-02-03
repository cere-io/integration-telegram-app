import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { useEventQueue } from '../hooks';
import { ActivityEvent, EventSource } from '@cere-activity-sdk/events';
import { EngagementEventData } from '../types';
import Reporting from '@tg-app/reporting';
import * as hbs from 'handlebars';
import { ENGAGEMENT_TIMEOUT_DURATION } from '../constants';
import { decodeHtml } from '../helpers';
import { useData } from '~/providers';
import { ColorScheme } from '@vkruglikov/react-telegram-web-app';

hbs.registerHelper('json', (context) => JSON.stringify(context));

type UseEngagementDataProps = {
  eventSource: EventSource | null;
  eventType: 'GET_QUESTS' | 'GET_LEADERBOARD';
  campaignId: string | null;
  theme?: ColorScheme;
  updateData: (data: any, html: string, key: 'quests' | 'leaderboard') => void;
  iframeRef?: MutableRefObject<HTMLIFrameElement | null>;
};

export const useEngagementData = ({
  eventSource,
  eventType,
  campaignId,
  theme,
  updateData,
  iframeRef,
}: UseEngagementDataProps) => {
  const { questsHtml, leaderboardHtml } = useData();
  const { addToQueue } = useEventQueue();
  const [isLoading, setLoading] = useState(eventType === 'GET_QUESTS' ? !questsHtml : !leaderboardHtml);
  const appStartTime = useRef<number>(performance.now());
  const activityStartTime = useRef<number | null>(null);
  const isFetching = useRef(false);

  useEffect(() => {
    if (!eventType) return;
    if (!isLoading) {
      const loadTime = performance.now() - appStartTime.current;
      Reporting.message(`${eventType} loaded: ${loadTime.toFixed(2)}ms`, {
        level: 'info',
        contexts: { loadTime: { duration: loadTime, unit: 'ms' } },
      });
    }
  }, [eventType, isLoading]);

  useEffect(() => {
    if (!eventSource || isFetching.current) return;
    isFetching.current = true;

    const fetchData = async () => {
      try {
        if (
          (eventType === 'GET_QUESTS' && questsHtml !== '') ||
          (eventType === 'GET_LEADERBOARD' && leaderboardHtml !== '')
        ) {
          setLoading(false);
        } else {
          setLoading(true);
        }
        activityStartTime.current = performance.now();
        const event = new ActivityEvent(eventType, {
          campaignId,
          campaign_id: campaignId,
          ...(theme && { theme }),
          timestamp: new Date().toISOString(),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSource]);

  useEffect(() => {
    // eslint-disable-next-line prefer-const
    let engagementTimeout: NodeJS.Timeout;
    if (!eventSource) return;

    const handleEngagementEvent = (event: any) => {
      clearTimeout(engagementTimeout);
      if (event?.payload?.integrationScriptResults[0]?.eventType === eventType) {
        const engagementTime = performance.now() - (activityStartTime.current || 0);
        Reporting.message(`${eventType} Engagement Loaded: ${engagementTime}ms`, {
          level: 'info',
          contexts: { engagementTime: { duration: engagementTime, unit: 'ms' } },
        });

        const { engagement, integrationScriptResults }: EngagementEventData = event.payload;
        const compiledHTML = hbs.compile(engagement.widget_template.params || '')({ data: integrationScriptResults });
        updateData(
          integrationScriptResults,
          decodeHtml(compiledHTML),
          eventType === 'GET_QUESTS' ? 'quests' : 'leaderboard',
        );

        if (iframeRef?.current) {
          const eventData = {
            type: eventType === 'GET_QUESTS' ? 'QUESTS_UPDATE' : 'LEADERBOARD_UPDATE',
            payload: {
              ...(eventType === 'GET_QUESTS' && {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                quests: integrationScriptResults?.[0].quests || {},
              }),
              ...(eventType === 'GET_LEADERBOARD' && {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                users: integrationScriptResults[0].users,
              }),
            },
          };
          iframeRef.current.contentWindow?.postMessage(eventData, '*');
        }

        setTimeout(() => setLoading(false), 0);
      }
    };

    engagementTimeout = setTimeout(() => {
      console.error(`${eventType} Engagement Timeout after ${ENGAGEMENT_TIMEOUT_DURATION}ms`);
      Reporting.message(`${eventType} Engagement Failed`, {
        level: 'error',
        contexts: { timeout: { duration: ENGAGEMENT_TIMEOUT_DURATION, unit: 'ms' } },
      });
    }, ENGAGEMENT_TIMEOUT_DURATION);

    eventSource.addEventListener('engagement', handleEngagementEvent);
    return () => {
      clearTimeout(engagementTimeout);
      eventSource.removeEventListener('engagement', handleEngagementEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSource, updateData]);

  return { isLoading };
};
