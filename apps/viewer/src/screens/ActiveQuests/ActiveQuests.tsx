import { QuestsList, QuestsListItem, Title, Spinner } from '@tg-app/ui';
import { useBot, useEvents } from '../../hooks';
import { useEffect, useMemo, useState } from 'react';
import { Campaign, Quest } from '@tg-app/api';
import { getActiveCampaign } from '@integration-telegram-app/creator/src/helpers';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData } from '~/types';

export const ActiveQuests = () => {
  const bot = useBot();
  const [activeCampaign, setActiveCampaign] = useState<Campaign>();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [preparingData, setPreparingData] = useState<boolean>(true);
  const [completedTaskIds, setCompletedTaskIds] = useState<number[]>([]);
  const eventSource = useEvents();

  useEffect(() => {
    bot.getCampaigns().then((campaigns) => {
      const campaign = getActiveCampaign(campaigns);
      if (campaign) {
        setActiveCampaign(campaign);
        setQuests(campaign.quests);
      }
    });
  }, [bot]);

  useEffect(() => {
    if (activeCampaign?.id) {
      const getCompletedTasks = async () => {
        const ready = await eventSource.isReady();
        console.log('EventSource ready:', ready);

        const { event_type, timestamp, data } = {
          event_type: 'GET_COMPLETED_TASKS',
          timestamp: new Date().toISOString(),
          data: JSON.stringify({
            campaignId: activeCampaign?.id,
            channelId: bot?.startParam,
          }),
        };

        const parsedData = JSON.parse(data);
        const event = new ActivityEvent(event_type, {
          ...parsedData,
          timestamp,
        });

        await eventSource.dispatchEvent(event);
      };

      const timeoutId = setTimeout(() => {
        setPreparingData(false);
      }, 3000);

      getCompletedTasks();

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [activeCampaign?.id, bot?.startParam, eventSource]);

  useEffect(() => {
    const handleEngagementEvent = (event: any) => {
      if (event?.payload && event.payload.integrationScriptResults[0].eventType === 'GET_COMPLETED_TASKS') {
        const { integrationScriptResults }: EngagementEventData = event.payload;
        const tasks: { key: string; doc_count: number }[] = (integrationScriptResults as any)[0]?.tasks || [];
        setCompletedTaskIds(tasks.map(({ key }) => +key));
        setPreparingData(false);
      }
    };

    eventSource.addEventListener('engagement', handleEngagementEvent);

    return () => {
      eventSource.removeEventListener('engagement', handleEngagementEvent);
    };
  }, [eventSource]);

  const sortedQuests = useMemo(() => {
    return [...quests].sort((a, b) => {
      const aCompleted = completedTaskIds.includes(a.id as number);
      const bCompleted = completedTaskIds.includes(b.id as number);

      if (!aCompleted && bCompleted) return -1;
      if (aCompleted && !bCompleted) return 1;

      const aHasVideo = Boolean(a.videoId);
      const bHasVideo = Boolean(b.videoId);

      if (aHasVideo && !bHasVideo) return -1;
      if (!aHasVideo && bHasVideo) return 1;

      return (b.rewardPoints || 0) - (a.rewardPoints || 0);
    });
  }, [quests, completedTaskIds]);

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
        <QuestsList>
          {sortedQuests.map((quest) => (
            <QuestsListItem
              key={quest.id}
              completed={completedTaskIds.includes(Number(quest.videoId))}
              name={quest?.title || ''}
              description={quest?.description || ''}
              rewardPoints={quest?.rewardPoints || 0}
              questType={quest.type as 'video' | 'post_x'}
            />
          ))}
        </QuestsList>
      )}
    </div>
  );
};
