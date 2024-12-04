import { useEffect, useMemo, useState } from 'react';
import { MediaList, MediaListItem, Button, Title } from '@tg-app/ui';
import { Campaign, Quest, Video } from '@tg-app/api';
import { AnalyticsId } from '@tg-app/analytics';

import { useBot, useEvents, useToken, useWallet } from '../../hooks';
import { VideoPlayer } from '../../components';
import type { ActiveTab } from '../../App';
import { getActiveCampaign } from '@integration-telegram-app/creator/src/helpers';
import { EVENT_APP_ID } from '../../constants.ts';
import { ActivityEvent } from '@cere-activity-sdk/events';

type MediaProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

export const Media = ({ setActiveTab }: MediaProps) => {
  const bot = useBot();
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign>();
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video>();
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
      setActiveCampaign(campaign);
      setActiveQuests(campaign.quests);
    });
  }, [bot]);

  useEffect(() => {
    const getCompletedTasks = async () => {
      const ready = await eventSource.isReady();
      console.log('EventSource ready:', ready);

      const { event_type, timestamp, userPubKey, appPubKey, data } = {
        event_type: 'GET_COMPLETED_TASKS',
        timestamp: new Date().toISOString(),
        userPubKey: account?.publicKey || '31a4e51cfcc492da79838bd4a2a59d694280e3feada2ff5f811f4916d9fbb0ac',
        appPubKey: EVENT_APP_ID,
        data: JSON.stringify({
          campaignId: activeCampaign?.id,
          channelId: bot?.startParam,
          id: '920cbd6e-3ac6-45fc-8b74-05adc5f6387f',
          app_id: EVENT_APP_ID,
          publicKey: account?.publicKey || '31a4e51cfcc492da79838bd4a2a59d694280e3feada2ff5f811f4916d9fbb0ac',
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
    };

    getCompletedTasks();
  }, [account?.publicKey, activeCampaign?.id, bot?.startParam, eventSource]);

  const questVideoMap = useMemo(() => {
    return activeQuests.reduce(
      (acc, quest) => {
        if (quest.videoId) {
          acc[quest.videoId] = quest.rewardPoints;
        }
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [activeQuests]);

  const sortedVideos = useMemo(() => {
    return [...videos].sort((a, b) => {
      const aInQuests = questVideoMap[a.id];
      const bInQuests = questVideoMap[b.id];

      if (aInQuests && !bInQuests) return -1;
      if (!aInQuests && bInQuests) return 1;
      return 0;
    });
  }, [videos, questVideoMap]);

  useEffect(() => {
    const handleEngagementEvent = (event: any) => {
      if (event?.payload) {
        debugger;
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

      <MediaList>
        {sortedVideos.map((video, index) => (
          <MediaListItem
            key={index}
            locked={false}
            loading={loading}
            name={video.title}
            description={video.description}
            thumbnailUrl={video.thumbnailUrl}
            onClick={() => setCurrentVideo(video)}
            rewardPoints={questVideoMap[video.id] ? questVideoMap[video.id] : null}
          />
        ))}
      </MediaList>

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
