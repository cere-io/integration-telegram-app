import './Leaderboard.css';
import { Spinner } from '@tg-app/ui';
import { useEffect, useState } from 'react';
import { useStartParam, useEvents, useWallet } from '../../hooks';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData } from '../../types';
import * as hbs from 'handlebars';

hbs.registerHelper('json', (context) => JSON.stringify(context));

export const Leaderboard = () => {
  const [leaderboardHtml, setLeaderboardHtml] = useState<string>('');
  const [isLoading, setLoading] = useState(true);

  const { account } = useWallet();
  const { startParam } = useStartParam();
  const eventSource = useEvents();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const ready = await eventSource.isReady();
        console.log('EventSource ready:', ready);

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
  }, [account?.publicKey, eventSource, startParam]);

  useEffect(() => {
    const handleEngagementEvent = (event: any) => {
      if (event?.payload && event.payload.integrationScriptResults[0].eventType === 'GET_LEADERBOARD') {
        const { engagement, integrationScriptResults }: EngagementEventData = event.payload;
        const { widget_template } = engagement;
        const users: { user: string; points: number }[] = (integrationScriptResults as any)[0]?.users || [];
        const userPublicKey: string = (integrationScriptResults as any)[0]?.userPublicKey || null;
        const compiledHTML = hbs.compile(widget_template.params || '')({
          users,
          userPublicKey,
        });
        setLeaderboardHtml(compiledHTML);

        setLoading(false);
      }
    };

    eventSource.addEventListener('engagement', handleEngagementEvent);

    return () => {
      eventSource.removeEventListener('engagement', handleEngagementEvent);
    };
  }, [eventSource]);

  return (
    <div className="leaderboard">
      {isLoading ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100vh - 60px)',
          }}
        >
          <Spinner size="l" />
        </div>
      ) : (
        <iframe
          srcDoc={leaderboardHtml}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Leaderboard"
        />
      )}
    </div>
  );
};
