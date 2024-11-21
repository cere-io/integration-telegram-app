import './Leaderboard.css';
import { Button, Spinner } from '@tg-app/ui';
import { useEffect, useState } from 'react';
import { AnalyticsId } from '@tg-app/analytics';
import { ActiveTab } from '~/App.tsx';
import Frame from 'react-frame-component';
import { useEvents, useWallet } from '~/hooks';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData } from '~/screens';
import * as hbs from 'handlebars';

type LeaderboardProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

export const Leaderboard = ({ setActiveTab }: LeaderboardProps) => {
  // const [leaderboardData, setLeaderboardData] = useState<Omit<ScoreProps, 'rank'>[]>([]);
  const [leaderboardHtml, setLeaderboardHtml] = useState<string>('');
  const [isLoading, setLoading] = useState(true); // Изначально лоадер отображается

  const { account } = useWallet();
  const eventSource = useEvents();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const ready = await eventSource.isReady();
        console.log('EventSource ready:', ready);

        const { event_type, timestamp, userPubKey, appPubKey, data } = {
          event_type: 'GET_LEADERBOARD',
          timestamp: '2024-11-15T09:01:01Z',
          userPubKey: '2ce686f936c69f91d91c30b4f4c6dc54d20dc13e50cdfba0b98f63dc57f27b78',
          appPubKey: '2095',
          data: JSON.stringify({
            id: '920cbd6e-3ac6-45fc-8b74-05adc5f6387f',
            app_id: '2095',
            account_id: '2ce686f936c69f91d91c30b4f4c6dc54d20dc13e50cdfba0b98f63dc57f27b78',
          }),
        };
        const parsedData = JSON.parse(data);
        const event = new ActivityEvent(event_type, {
          ...parsedData,
          timestamp,
          userPubKey,
          appPubKey,
        });

        await eventSource.dispatchEvent(event);
        console.log('GET_LEADERBOARD dispatched');
      } catch (error) {
        console.error('Error dispatching event:', error);
      }
    };

    fetchData();
  }, [eventSource]);

  useEffect(() => {
    const handleEngagementEvent = (event: any) => {
      console.log('LEADERBOARD event:', event);
      if (event?.payload) {
        const { engagement, userProfile }: EngagementEventData = event.payload;
        const { widget_template } = engagement;
        const newData =
          userProfile[0]?.users.map(({ key, doc_count }) => ({
            user: key,
            score: doc_count,
          })) || [];

        const compiledHTML = hbs.compile(widget_template.params || '')({
          users: new hbs.SafeString(JSON.stringify(newData)),
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
            height: '90vh',
          }}
        >
          <Spinner size="l" />
        </div>
      ) : (
        <Frame>
          <div dangerouslySetInnerHTML={{ __html: leaderboardHtml }} />
        </Frame>
      )}
      {!account?.address && (
        <div className="cta-button-wrapper">
          <Button
            mode="cta"
            size="l"
            className={AnalyticsId.premiumBtn}
            onClick={() => setActiveTab({ index: 1, props: { showSubscribe: true } })}
          >
            Subscribe and start getting up to the top
          </Button>
        </div>
      )}
    </div>
  );
};
