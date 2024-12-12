import { useEffect, useState } from 'react';
import { MediaList, MediaListItem, Title, Spinner } from '@tg-app/ui';

import { useEvents, useStartParam } from '../../hooks';
import { VideoPlayer } from '../../components';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { EngagementEventData, Video } from '../../types';

export const Media = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [preparingData, setPreparingData] = useState<boolean>(true);
  const [currentVideo, setCurrentVideo] = useState<Video>();
  const eventSource = useEvents();
  const { startParam } = useStartParam();

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

  const sortedVideos = videos.sort((a, b) => {
    const completedA = a.completed ?? false;
    const completedB = b.completed ?? false;

    return Number(completedA) - Number(completedB);
  });

  useEffect(() => {
    const handleEngagementEvent = (event: any) => {
      if (event?.payload && event.payload.integrationScriptResults[0].eventType === 'GET_QUESTS') {
        const { integrationScriptResults }: EngagementEventData = event.payload;
        const videos: Video[] = (integrationScriptResults as any)[0]?.videos || [];
        setVideos(videos);
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
    <div style={{ paddingBottom: 0 }}>
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
