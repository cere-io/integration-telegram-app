import { useEffect, useState } from 'react';
import { Title, MediaList, MediaListItem } from '@tg-app/ui';
import { Video } from '@tg-app/api';

import { useBot } from '~/hooks';

export const Media = () => {
  const bot = useBot();
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    bot.getVideos().then(setVideos);
  }, [bot]);

  return (
    <>
      <Title style={{ margin: 8, marginBottom: 16 }}>Media</Title>
      <MediaList>
        {videos.map((video, index) => (
          <MediaListItem
            key={index}
            name={video.name}
            description={video.description}
            thumbnailUrl={video.thumbnailUrl}
          />
        ))}
      </MediaList>
    </>
  );
};
