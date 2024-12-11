import { Quest } from '@tg-app/api';
import {
  Card,
  Badge,
  CardProps,
  Text,
  EditIcon,
  LeaderboardIcon,
  IconButton,
  Modal,
  Button,
  Spinner,
} from '@tg-app/ui';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useEvents } from '../../hooks';
import { useBot } from '@integration-telegram-app/viewer/src/hooks';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData } from '@integration-telegram-app/viewer/src/types';
import * as hbs from 'handlebars';

hbs.registerHelper('json', (context) => JSON.stringify(context));

export type CampaignListItemProps = Pick<CardProps, 'onClick'> & {
  campaignId?: number;
  title: string;
  description: string;
  quests: Quest[];
};

export const CampaignListItem = ({ campaignId, title, description, quests, onClick }: CampaignListItemProps) => {
  const [modalOpened, setModalOpened] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [leaderboardHtml, setLeaderboardHtml] = useState<string>('');
  const [users, setUsers] = useState<{ user: string; points: number }[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const eventSource = useEvents();
  const bot = useBot();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!modalOpened || !campaignId) return;

      if (!(await eventSource.isReady())) return;

      try {
        setIsLoading(true);

        const event = new ActivityEvent('GET_LEADERBOARD', {
          campaignId,
          channelId: bot?.startParam,
          timestamp: new Date().toISOString(),
        });

        await eventSource.dispatchEvent(event);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    };

    fetchLeaderboard();
  }, [campaignId, modalOpened, bot?.startParam, eventSource]);

  useEffect(() => {
    const handleEngagementEvent = (event: any) => {
      const payload = event?.payload;

      if (payload && payload.integrationScriptResults?.[0]?.eventType === 'GET_LEADERBOARD') {
        const { engagement, integrationScriptResults }: EngagementEventData = payload;
        const { widget_template } = engagement;
        const users = (integrationScriptResults as any)[0]?.users || [];
        setUsers(users);
        const userPublicKey = (integrationScriptResults as any)[0]?.userPublicKey || null;

        const compiledHtml = hbs.compile(widget_template.params || '')({
          users,
          userPublicKey,
        });

        setLeaderboardHtml(compiledHtml);
        setIsLoading(false);
      }
    };

    eventSource.addEventListener('engagement', handleEngagementEvent);

    return () => {
      eventSource.removeEventListener('engagement', handleEngagementEvent);
    };
  }, [eventSource]);

  useEffect(() => {
    const resizeIframe = () => {
      if (iframeRef.current?.parentElement) {
        const modalHeight = iframeRef.current.parentElement.offsetHeight;
        iframeRef.current.style.height = `${modalHeight}px`;
      }
    };

    resizeIframe();
    window.addEventListener('resize', resizeIframe);

    return () => {
      window.removeEventListener('resize', resizeIframe);
    };
  }, [leaderboardHtml]);

  const handleOnDownload = useCallback(() => {
    const csvString = [['Public Address', 'Score'], ...users.map((item) => [item.user, item.points])]
      .map((row) => row.join(','))
      .join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Leaderboard_for_campaign_${title}_${campaignId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [campaignId, title, users]);

  return (
    <Card style={{ width: 'auto', height: '100px', marginBottom: '1rem', padding: '1rem' }}>
      <Badge style={{ width: 'fit-content', marginBottom: '2rem' }} type="number">
        {quests.length} Quests
      </Badge>
      <Text Component="h3" weight="1">
        {title}
      </Text>
      <Text>{description}</Text>

      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <IconButton onClick={onClick}>
          <EditIcon />
        </IconButton>
        <Modal
          trigger={
            <IconButton>
              <LeaderboardIcon />
            </IconButton>
          }
          header={<Modal.Header>Leaderboard</Modal.Header>}
          onOpenChange={setModalOpened}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minHeight: '70vh',
            }}
          >
            <Text Component="h1">Leaderboard</Text>
            {isLoading ? (
              <Spinner size="l" style={{ margin: 'auto' }} />
            ) : (
              <>
                <Button style={{ margin: '1rem 0' }} onClick={handleOnDownload}>
                  Download leaderboard
                </Button>
                <iframe
                  ref={iframeRef}
                  srcDoc={leaderboardHtml}
                  style={{ width: '100%', border: 'none' }}
                  title="Leaderboard"
                />
              </>
            )}
          </div>
        </Modal>
      </div>
    </Card>
  );
};
