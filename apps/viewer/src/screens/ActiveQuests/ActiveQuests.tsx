import { Title, Spinner } from '@tg-app/ui';
import { useEvents, useStartParam } from '../../hooks';
import { useEffect, useState } from 'react';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData, Quests } from '~/types';
import hbs from 'handlebars';

hbs.registerHelper('json', (context) => JSON.stringify(context));

export const ActiveQuests = () => {
  const [preparingData, setPreparingData] = useState<boolean>(true);
  const [questsHtml, setQuestsHtml] = useState<string>('');
  const eventSource = useEvents();
  const { startParam } = useStartParam();

  console.log({ questsHtml });

  useEffect(() => {
    const getQuests = async () => {
      const ready = await eventSource.isReady();
      console.log('EventSource ready:', ready);

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
    const handleEngagementEvent = (event: any) => {
      if (event?.payload && event.payload.integrationScriptResults[0].eventType === 'GET_QUESTS') {
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

    eventSource.addEventListener('engagement', handleEngagementEvent);

    return () => {
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
