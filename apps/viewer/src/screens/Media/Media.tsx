import { useEffect, useState } from 'react';
import { MediaList, MediaListItem, Title, Text, Loader } from '@tg-app/ui';
import Reporting from '@tg-app/reporting';
import { useEngagementData, useEvents, useStartParam } from '../../hooks';
import { VideoPlayer } from '../../components';
import { EngagementEventData, Video } from '../../types';
import { ENGAGEMENT_TIMEOUT_DURATION } from '../../constants.ts';
import { useData } from '~/providers';

export type MediaTypeProps = {
  videoUrl?: string;
};

export const Media = ({ videoUrl }: MediaTypeProps) => {
  const { questData, updateData, updateQuestStatus } = useData();
  const [videos, setVideos] = useState<Video[]>(questData?.[0].quests.videoTasks || []);
  const [currentVideo, setCurrentVideo] = useState<Video>();
  const [pendingUpdates, setPendingUpdates] = useState<Partial<Video>[]>([]);
  const eventSource = useEvents();
  const { campaignId } = useStartParam();

  const { isLoading } = useEngagementData({
    eventSource,
    eventType: 'GET_QUESTS',
    campaignId,
    updateData,
  });

  const sortedVideos = videos.sort((a, b) => {
    const completedA = a.completed ?? false;
    const completedB = b.completed ?? false;

    return Number(completedA) - Number(completedB);
  });

  useEffect(() => {
    // eslint-disable-next-line prefer-const
    let engagementTimeout: NodeJS.Timeout;

    if (!eventSource) return;

    const handleEngagementEvent = (event: any) => {
      clearTimeout(engagementTimeout);

      if (event?.payload && event.payload.integrationScriptResults[0].eventType === 'SEGMENT_WATCHED') {
        const { integrationScriptResults }: EngagementEventData = event.payload;
        const questId = (integrationScriptResults as any)[0].questId;

        setPendingUpdates((prevUpdates) => [...prevUpdates, { videoUrl: questId, completed: true }]);
        updateQuestStatus(questId, 'videoTasks', true);
      }
    };

    engagementTimeout = setTimeout(() => {
      const timeoutDuration = ENGAGEMENT_TIMEOUT_DURATION;
      console.error(`Media Engagement Timeout after ${timeoutDuration}ms`);

      Reporting.message('Media Engagement Failed', {
        level: 'error',
        contexts: {
          timeout: {
            duration: timeoutDuration,
            unit: 'ms',
          },
        },
      });
    }, ENGAGEMENT_TIMEOUT_DURATION);

    eventSource.addEventListener('engagement', handleEngagementEvent);

    return () => {
      clearTimeout(engagementTimeout);
      eventSource.removeEventListener('engagement', handleEngagementEvent);
    };
  }, [eventSource, videos]);

  useEffect(() => {
    if (!currentVideo && pendingUpdates.length > 0) {
      setVideos((prevVideos) =>
        prevVideos.map((video) =>
          pendingUpdates.some((update) => update.videoUrl === video.videoUrl)
            ? { ...video, ...pendingUpdates.find((update) => update.videoUrl === video.videoUrl) }
            : video,
        ),
      );
      setPendingUpdates([]);
    }
  }, [currentVideo, pendingUpdates]);

  useEffect(() => {
    if (videoUrl && videos.length > 0) {
      const video = videos.find((video) => videoUrl === video?.videoUrl);
      if (video) {
        setCurrentVideo(video);
      }
    }
  }, [videoUrl, videos]);

  return (
    <div style={{ paddingBottom: 65 }}>
      <Title weight="2" style={{ marginLeft: 16, marginTop: 16 }}>
        Library
      </Title>
      <Text Component="div" style={{ margin: '16px 16px 0 16px', color: 'rgb(113, 118, 132)' }}>
        Explore our growing collection of community videos and earn rewards for watching! Each video watched brings you
        closer to unlocking exclusive prizes!
      </Text>

      {isLoading ? (
        <Loader size="m" style={{ marginTop: '50%' }} />
      ) : (
        <MediaList>
          {sortedVideos.map((video, index) => (
            <MediaListItem
              key={index}
              completed={video?.completed || false}
              name={video.title}
              description={video.description}
              thumbnailUrl={video.thumbnailUrl}
              onClick={() => setCurrentVideo(video)}
              rewardPoints={video.points}
            />
          ))}
        </MediaList>
      )}

      {!!currentVideo && (
        <VideoPlayer open={!!currentVideo} video={currentVideo} onClose={() => setCurrentVideo(undefined)} />
      )}
    </div>
  );
};
