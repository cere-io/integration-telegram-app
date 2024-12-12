import { QuestsList, QuestsListItem, Title, Spinner } from '@tg-app/ui';
import { useEvents, useStartParam } from '../../hooks';
import { useEffect, useMemo, useState } from 'react';
import { ActivityEvent, CereWalletSigner } from '@cere-activity-sdk/events';
import { EngagementEventData, Quests, SocialTask } from '~/types';
import { useCereWallet } from '../../cere-wallet';

export const ActiveQuests = () => {
  const [preparingData, setPreparingData] = useState<boolean>(true);
  const [quests, setQuests] = useState<Quests>();
  const [accountId, setAccountId] = useState<string>();
  const eventSource = useEvents();
  const { startParam } = useStartParam();
  const cereWallet = useCereWallet();

  useEffect(() => {
    const signer = new CereWalletSigner(cereWallet);
    signer.isReady().then(() => {
      setAccountId(signer.address);
    });
  }, [accountId, cereWallet]);

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
        const { integrationScriptResults }: EngagementEventData = event.payload;
        const quests: Quests = (integrationScriptResults as any)[0]?.quests || {};
        setQuests(quests);
        setPreparingData(false);
      }
    };

    eventSource.addEventListener('engagement', handleEngagementEvent);

    return () => {
      eventSource.removeEventListener('engagement', handleEngagementEvent);
    };
  }, [eventSource]);

  const sortedQuests = useMemo(() => {
    const allTasks = [
      ...(quests?.videoTasks.map((task) => ({ ...task, type: 'videoTask' })) || []),
      ...(quests?.socialTasks.map((task) => ({ ...task, type: 'socialTask' })) || []),
      ...(quests?.dexTasks.map((task) => ({ ...task, type: 'dexTask' })) || []),
    ];
    return allTasks.sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

      return (b.points || 0) - (a.points || 0);
    });
  }, [quests]);

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
          {sortedQuests.map((quest, idx) => (
            <QuestsListItem
              key={idx}
              completed={quest.completed || false}
              name={quest?.title || ''}
              description={quest?.description || ''}
              rewardPoints={quest?.points || 0}
              questType={quest.type as 'videoTask' | 'socialTask' | 'dexTask'}
              postUrl={quest.type === 'socialTask' ? (quest as SocialTask).tweetLink : ''}
              accountId={accountId}
              campaignId={startParam}
            />
          ))}
        </QuestsList>
      )}
    </div>
  );
};
