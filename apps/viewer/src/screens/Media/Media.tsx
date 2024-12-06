import { useEffect, useMemo, useState } from 'react';
import { MediaList, MediaListItem, Button, Title, Spinner } from '@tg-app/ui';
import { Campaign, Quest, Video } from '@tg-app/api';
import { AnalyticsId } from '@tg-app/analytics';

import { useBot, useEvents, useToken, useWallet } from '../../hooks';
import { VideoPlayer } from '../../components';
import type { ActiveTab } from '../../App';
import { getActiveCampaign } from '@integration-telegram-app/creator/src/helpers';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData } from '~/types';

type MediaProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

export const Media = ({ setActiveTab }: MediaProps) => {
  const bot = useBot();
  const [preparingData, setPreparingData] = useState<boolean>(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign>();
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video>();
  const [completedTaskIds, setCompletedTaskIds] = useState<number[]>([]);
  const { token, loading } = useToken();
  const eventSource = useEvents();
  const { account } = useWallet();
  const hasSubscribeButton = !token && !loading && !!videos.length;

  useEffect(() => {
    bot.getVideos().then(setVideos);
  }, [bot]);

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
          channelId: bot?.startParam || '-1002433493900',
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

  const questVideoMap = useMemo(() => {
    return activeQuests.reduce(
      (acc, quest) => {
        if (quest.videoId) {
          acc[quest.videoId] = quest.rewardPoints as number;
        }
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [activeQuests]);

  const sortedVideos = useMemo(() => {
    return [...videos].sort((a, b) => {
      const aCompleted = completedTaskIds.includes(a.id as number);
      const bCompleted = completedTaskIds.includes(b.id as number);

      const aInCampaign = questVideoMap[a.id as number];
      const bInCampaign = questVideoMap[b.id as number];

      if (!aCompleted && bCompleted && aInCampaign) return -1;
      if (aCompleted && !bCompleted) return 1;

      if (aInCampaign && !bInCampaign) return -1;
      if (!aInCampaign && bInCampaign) return 1;

      return 0;
    });
  }, [videos, completedTaskIds, questVideoMap]);

  useEffect(() => {
    const handleEngagementEvent = (event: any) => {
      if (event?.payload && event.payload.integrationScriptResults[0].eventType === 'GET_COMPLETED_TASKS') {
        const { integrationScriptResults }: EngagementEventData = event.payload;
        const tasks: { key: string; doc_count: number }[] = (integrationScriptResults as any)[0]?.tasks || [];
        setCompletedTaskIds(tasks.map(({ key }) => +key));
        setPreparingData(false);
      }

      if (event?.payload && event.payload.integrationScriptResults[0].eventType === 'VIDEO_ENDED') {
        console.log('Get_Notification');
      }
    };

    eventSource.addEventListener('engagement', handleEngagementEvent);

    return () => {
      eventSource.removeEventListener('engagement', handleEngagementEvent);
    };
  }, [eventSource]);

  return (
    <div style={{ paddingBottom: hasSubscribeButton ? 62 : 0 }}>
      <Title weight="2" style={{ marginLeft: 16, marginTop: 16 }}>
        Library
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
        <MediaList>
          {sortedVideos.map((video, index) => (
            <MediaListItem
              key={index}
              locked={!token}
              completed={completedTaskIds.includes(video.id as number)}
              loading={loading}
              name={video.title}
              description={video.description}
              thumbnailUrl={video.thumbnailUrl}
              onClick={() => setCurrentVideo(video)}
              rewardPoints={questVideoMap[video.id as number] || undefined}
            />
          ))}
        </MediaList>
      )}

      {hasSubscribeButton && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 'calc(var(--safe_area_inset_bottom) + 80px)',
          }}
        >
          <Button
            mode="cta"
            size="l"
            className={AnalyticsId.premiumBtn}
            onClick={() => setActiveTab({ index: 1, props: { showSubscribe: true } })}
          >
            ⭐ Become a Premium member!
          </Button>
        </div>
      )}

      <VideoPlayer
        open={!!currentVideo}
        video={currentVideo}
        token={token}
        onClose={() => setCurrentVideo(undefined)}
      />
    </div>
  );
};
