import { Loader } from '@tg-app/ui';
import { useEvents, useStartParam } from '../../hooks';
import { useEffect, useRef, useState } from 'react';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData } from '~/types';
import hbs from 'handlebars';
import Reporting from '@tg-app/reporting';
import { ENGAGEMENT_TIMEOUT_DURATION } from '../../constants.ts';
import { ActiveTab } from '~/App.tsx';
import { useThemeParams } from '@vkruglikov/react-telegram-web-app';

hbs.registerHelper('json', (context) => JSON.stringify(context));

type ActiveQuestsProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

export const ActiveQuests = ({ setActiveTab }: ActiveQuestsProps) => {
  const [preparingData, setPreparingData] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [questsHtml, setQuestsHtml] = useState<string>('');
  const eventSource = useEvents();
  const { campaignId } = useStartParam();

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
    const handleIframeClick = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'VIDEO_QUEST_CLICK') {
        setActiveTab({
          index: 2,
          props: {
            videoUrl: event.data.videoUrl,
          },
        });
      }
    };

    window.addEventListener('message', handleIframeClick);

    return () => {
      window.removeEventListener('message', handleIframeClick);
    };
  }, [setActiveTab]);

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

      await eventSource.dispatchEvent(event);
    };

    getQuests();
  }, [eventSource, campaignId, theme]);

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

        setQuestsHtml(compiledHTML);
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
  }, [eventSource]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {preparingData ? (
        <Loader size="m" />
      ) : (
        <iframe
          srcDoc={questsHtml}
          style={{
            width: '100%',
            height: 'calc(100vh - 74px)',
            border: 'none',
          }}
          title="Active Quests"
        />
      )}
    </div>
  );
};
