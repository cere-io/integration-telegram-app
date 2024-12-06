import { Truncate, Text, CheckMarkIcon, Spinner } from '@tg-app/ui';
import './QuestsModalContent.css';
import { Campaign, Quest } from '@tg-app/api';
import { useEffect, useState } from 'react';
import { ActiveTab } from '../../../App.tsx';
import { Progress } from '@telegram-apps/telegram-ui';
import { useBot, useEvents, useWallet } from '../../../hooks';
import { getActiveCampaign } from '@integration-telegram-app/creator/src/helpers';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData } from '~/types';

type Props = {
  currentUser: { publicKey: string; score: number };
  setActiveTab: (tab: ActiveTab) => void;
};

export const QuestsModalContent = ({ currentUser, setActiveTab }: Props) => {
  const bot = useBot();

  const [activeCampaign, setActiveCampaign] = useState<Campaign>();
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedTaskIds, setCompletedTaskIds] = useState<number[]>([]);

  const eventSource = useEvents();
  const { account } = useWallet();

  useEffect(() => {
    bot.getCampaigns().then((campaigns) => {
      const campaign = getActiveCampaign(campaigns);
      if (campaign) {
        setActiveCampaign(campaign);
        setActiveQuests(campaign.quests);
      }
    });
  }, [bot]);

  useEffect(() => {
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

    getCompletedTasks();
  }, [account?.publicKey, activeCampaign?.id, bot?.startParam, eventSource]);

  useEffect(() => {
    const handleEngagementEvent = (event: any) => {
      if (event?.payload && event.payload.integrationScriptResults[0].eventType === 'GET_COMPLETED_TASKS') {
        const { integrationScriptResults }: EngagementEventData = event.payload;
        const tasks: { key: string; doc_count: number }[] = (integrationScriptResults as any)[0]?.tasks || [];
        setCompletedTaskIds(tasks.map(({ key }) => +key));
        setLoading(false);
      }
    };

    eventSource.addEventListener('engagement', handleEngagementEvent);

    return () => {
      eventSource.removeEventListener('engagement', handleEngagementEvent);
    };
  }, [eventSource]);

  const watchedCount = activeQuests.filter((quest) => completedTaskIds?.includes(Number(quest?.videoId))).length;
  const totalCount = activeQuests.length;
  const progress = totalCount > 0 ? (watchedCount / totalCount) * 100 : 0;

  let progressText = '';
  if (progress === 0) {
    progressText = 'Start to work';
  } else if (progress < 100) {
    progressText = 'Could do better';
  } else {
    progressText = 'Nice work!';
  }

  return (
    <>
      <div className="top-widget">
        <Text>
          <Truncate maxLength={10} text={currentUser.publicKey} />
        </Text>
        <Text color="white">{currentUser.score}</Text>
      </div>
      {loading ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spinner size="m" />
        </div>
      ) : (
        <>
          <div className="progress-bar-block">
            <Progress value={progress} className="progress-bar" />
            <Text className="progress-bar-text">
              {watchedCount} out of {totalCount} tasks completed – {progressText}
            </Text>
          </div>
          {activeQuests.length > 0 &&
            activeQuests.map(({ title, id, videoId }) => {
              const watched = completedTaskIds?.includes(Number(videoId));
              return (
                <div key={id} className="quests-board">
                  <div className="quest-block">
                    <Text className="quest-title">
                      Quick Watch{' '}
                      <span
                        className="pseudo-link"
                        onClick={() => setActiveTab({ index: 0, props: { showSubscribe: false } })}
                      >
                        {title}
                      </span>
                    </Text>
                    <Text className={`quest-status ${watched ? 'watched' : 'not-watched'}`}>
                      {watched ? (
                        <>
                          <CheckMarkIcon /> Done
                        </>
                      ) : (
                        '+ 50 Pts'
                      )}
                    </Text>
                  </div>
                </div>
              );
            })}
        </>
      )}
    </>
  );
};
