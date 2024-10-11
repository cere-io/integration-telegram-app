import { useEffect, useState } from 'react';
import { MediaList, MediaListItem, Button, Title } from '@tg-app/ui';
import { Video } from '@tg-app/api';
import { AnalyticsId } from '@tg-app/analytics';

import { useBot, useToken } from '~/hooks';
import { VideoPlayer } from '~/components';
import type { ActiveTab } from '~/App';

type MediaProps = {
  setActiveTab: (tab: ActiveTab) => void;
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
      <Title weight="2" style={{ marginLeft: 16, marginTop: 16 }}>
        Library
      </Title>

      <MediaList>
        {videos.map((video, index) => (
          <MediaListItem
            key={index}
            locked={!token}
            loading={loading}
            name={video.title}
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
