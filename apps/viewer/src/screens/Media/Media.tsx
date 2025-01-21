import { useEffect, useRef, useState } from 'react';
import { MediaList, MediaListItem, Title, Text, Loader } from '@tg-app/ui';
import Reporting from '@tg-app/reporting';
import { useEvents, useStartParam } from '../../hooks';
import { VideoPlayer } from '../../components';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData, Video } from '../../types';
import { ENGAGEMENT_TIMEOUT_DURATION } from '../../constants.ts';

export type MediaTypeProps = {
  videoUrl?: string;
};

export const Media = ({ videoUrl }: MediaTypeProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [preparingData, setPreparingData] = useState<boolean>(true);
  const [currentVideo, setCurrentVideo] = useState<Video>();
  const eventSource = useEvents();
  const { campaignId } = useStartParam();

  const activityStartTime = useRef<number | null>(null);

  useEffect(() => {
    const getQuests = async () => {
      if (!eventSource) return;

      activityStartTime.current = performance.now();

      const { event_type, timestamp, data } = {
        event_type: 'GET_QUESTS',
        timestamp: new Date().toISOString(),
        data: JSON.stringify({
          campaignId: campaignId,
          campaign_id: campaignId,
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
  }, [eventSource, campaignId]);

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

      if (event?.payload && event.payload.integrationScriptResults[0].eventType === 'GET_QUESTS') {
        const engagementTime = performance.now() - (activityStartTime.current || 0);
        console.log(`Media Engagement Time: ${engagementTime}ms`);

        Reporting.message(`Media Engagement Loaded: ${engagementTime.toFixed(2)}`, {
          level: 'info',
          contexts: {
            engagementTime: {
              duration: engagementTime,
              unit: 'ms',
            },
          },
        });

        const { integrationScriptResults }: EngagementEventData = event.payload;
        const videos: any = (integrationScriptResults as any)[0]?.quests?.videoTasks || [];
        setVideos(videos);
        setPreparingData(false);
      }

      if (
        (event?.payload && event.payload.integrationScriptResults[0].eventType === 'SEGMENT_WATCHED') ||
        (event?.payload && event.payload.integrationScriptResults[0].eventType === 'X_REPOST')
      ) {
        const { integrationScriptResults }: EngagementEventData = event.payload;
        const questId = (integrationScriptResults as any)[0].questId;

        setVideos((prevVideos) =>
          prevVideos.map((video) => (video.videoUrl === questId ? { ...video, completed: true } : video)),
        );
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

      {preparingData ? (
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
