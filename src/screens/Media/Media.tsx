import { useEffect, useState } from 'react';
import { MediaList, MediaListItem, Banner, MediaLogo, Button } from '@tg-app/ui';
import { Video } from '@tg-app/api';

import { useBot, useToken } from '~/hooks';
import { VideoPlayer } from '~/components';

type MediaProps = {
  setActiveTab: (index: number) => void;
};

export const Media = ({ setActiveTab }: MediaProps) => {
  const bot = useBot();
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video>();
  const { token, loading } = useToken();
  const hasSubscribeButton = !token && !loading && !!videos.length;

  useEffect(() => {
    bot.getVideos().then(setVideos);
  }, [bot]);

  return (
    <div style={{ paddingBottom: hasSubscribeButton ? 62 : 0 }}>
      <Banner
        before={<MediaLogo />}
        header="#FREEDUROV"
        subheader="Join the Decentralization Movement, watch Tucker Carlson’s uncensored, unstoppable interview with Pavel Durov now, streamed from the Cere DDC."
      />

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
          <Button size="l" onClick={() => setActiveTab(1)}>
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
