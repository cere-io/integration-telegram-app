import { Title, Spinner } from '@tg-app/ui';
import { useEvents, useStartParam } from '../../hooks';
import { useEffect, useRef, useState } from 'react';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData, Quests } from '~/types';
import hbs from 'handlebars';
import Reporting from '@tg-app/reporting';
import { ENGAGEMENT_TIMEOUT_DURATION } from '~/constants.ts';

hbs.registerHelper('json', (context) => JSON.stringify(context));

export const ActiveQuests = () => {
  const [preparingData, setPreparingData] = useState<boolean>(true);
  const [questsHtml, setQuestsHtml] = useState<string>('');
  const eventSource = useEvents();
  const { startParam } = useStartParam();

  const activityStartTime = useRef<number | null>(null);

  useEffect(() => {
    const getQuests = async () => {
      const ready = await eventSource.isReady();
      console.log('EventSource ready:', ready);

      activityStartTime.current = performance.now();

      const { event_type, timestamp, data } = {
        event_type: 'GET_QUESTS',
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
    };

    getQuests();
  }, [eventSource, startParam]);

  useEffect(() => {
    // eslint-disable-next-line prefer-const
    let engagementTimeout: NodeJS.Timeout;
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

        const quests: Quests = (integrationScriptResults as any)[0]?.quests || {};
        const campaignId: string = (integrationScriptResults as any)[0]?.campaignId || '';
        const accountId: string = (integrationScriptResults as any)[0]?.accountId || '';

        const compiledHTML = hbs.compile(widget_template.params || '')({
          quests,
          campaignId,
          accountId,
        });
        setQuestsHtml(compiledHTML);
        setPreparingData(false);
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

      setPreparingData(false);
    }, ENGAGEMENT_TIMEOUT_DURATION);

    eventSource.addEventListener('engagement', handleEngagementEvent);

    return () => {
      clearTimeout(engagementTimeout);
      eventSource.removeEventListener('engagement', handleEngagementEvent);
    };
  }, [eventSource]);

  return (
    <div>
      <Title weight="2" style={{ marginLeft: 16, marginTop: 16 }}>
        Yours weekly tasks
      </Title>
      {preparingData ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100vh - 60px)',
          }}
        >
          <Spinner size="m" />
        </div>
      ) : (
        <iframe srcDoc={questsHtml} style={{ width: '100%', height: '100vh', border: 'none' }} title="Active Quests" />
      )}
    </div>
  );
};
