import { useEffect, useState } from 'react';
import { MediaList, MediaListItem } from '@tg-app/ui';
import { Video } from '@tg-app/api';

import { useBot, useToken } from '~/hooks';
import { VideoPlayer } from '~/components';

export const Media = () => {
  const bot = useBot();
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video>();
  const { token, loading } = useToken();

  useEffect(() => {
    bot.getVideos().then(setVideos);
  }, [bot]);

  return (
    <>
      <MediaList>
        {videos.map((video, index) => (
          <MediaListItem
            key={index}
            locked={!token}
            loading={loading}
            name={video.name}
            description={video.description}
            thumbnailUrl={video.thumbnailUrl}
            onClick={() => setCurrentVideo(video)}
          />
        ))}
      </MediaList>

      <VideoPlayer
        open={!!currentVideo}
        video={currentVideo}
        token={token}
        onClose={() => setCurrentVideo(undefined)}
      />
    </>
  );
};
