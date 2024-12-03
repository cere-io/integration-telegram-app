import './Leaderboard.css';
import { Button, Spinner } from '@tg-app/ui';
import { useEffect, useState } from 'react';
import { AnalyticsId } from '@tg-app/analytics';
import { ActiveTab } from '../../App.tsx';
import { useBot, useEvents, useWallet } from '../../hooks';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData } from '../index';
import * as hbs from 'handlebars';
import { EVENT_APP_ID } from '../../constants.ts';
import { Modal } from '../../components/Modal';
import { QuestsModalContent } from '../../components/Leaderboard/QuestsModalContent';

type LeaderboardProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

hbs.registerHelper('json', (context) => JSON.stringify(context));

export const Leaderboard = ({ setActiveTab }: LeaderboardProps) => {
  const [leaderboardHtml, setLeaderboardHtml] = useState<string>('');
  const [isLoading, setLoading] = useState(true);
  const [currentUserData, setCurrentUserData] = useState<{ publicKey: string; score: number }>();
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  const { account } = useWallet();
  const bot = useBot();
  const eventSource = useEvents();

  useEffect(() => {
    const handleIframeClick = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'GET_QUEST_BOARD' && currentUserData) {
        setModalContent(<QuestsModalContent currentUser={currentUserData} setActiveTab={setActiveTab} />);
        setModalOpen(true);
      }
    };

    window.addEventListener('message', handleIframeClick);

    return () => {
      window.removeEventListener('message', handleIframeClick);
    };
  }, [currentUserData, setActiveTab]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const ready = await eventSource.isReady();
        console.log('EventSource ready:', ready);

        const { event_type, timestamp, userPubKey, appPubKey, data } = {
          event_type: 'GET_LEADERBOARD',
          timestamp: '2024-11-15T09:01:01Z',
          userPubKey: account?.publicKey,
          appPubKey: EVENT_APP_ID,
          data: JSON.stringify({
            channelId: bot?.startParam,
            id: '920cbd6e-3ac6-45fc-8b74-05adc5f6387f',
            app_id: EVENT_APP_ID,
            account_id: account?.publicKey,
            publicKey: account?.publicKey,
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
      } catch (error) {
        console.error('Error dispatching event:', error);
      }
    };

    fetchData();
  }, [account?.publicKey, bot?.startParam, eventSource]);

  useEffect(() => {
    const handleEngagementEvent = (event: any) => {
      if (event?.payload) {
        const { engagement, integrationScriptResults }: EngagementEventData = event.payload;
        const { widget_template } = engagement;
        const users: { key: string; doc_count: number }[] = (integrationScriptResults as any)[0]?.users || [];
        const userPublicKey: string = (integrationScriptResults as any)[0]?.userPublicKey || null;
        const newData =
          users?.map(({ key, doc_count }) => ({
            publicKey: key,
            score: doc_count,
          })) || [];

        const compiledHTML = hbs.compile(widget_template.params || '')({
          users: newData,
          userPublicKey,
        });
        setLeaderboardHtml(compiledHTML);

        const currentUser = newData.find((u) => u.publicKey === userPublicKey);
        if (currentUser) {
          setCurrentUserData(currentUser);
        }

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
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} content={modalContent} />
    </div>
  );
};
