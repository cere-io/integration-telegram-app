import { useEffect, useState } from 'react';
import { MediaList, MediaListItem } from '@tg-app/ui';
import { Video } from '@tg-app/api';

import { useBot } from '~/hooks';

export const Media = () => {
  const bot = useBot();
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    bot.getVideos().then(setVideos);
  }, [bot]);

  return (
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
  );
};
