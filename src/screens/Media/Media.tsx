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

  useEffect(() => {
    bot.getVideos().then(setVideos);
  }, [bot]);

  return (
    <>
      <Banner before={<MediaLogo />} header="CereMedia" subheader="Your Gateway to Premium Content" />

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

      {!token && !loading && !!videos.length && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, marginTop: 16 }}>
          <Button onClick={() => setActiveTab(1)}>Subscribe to Unlock All!</Button>
        </div>
      )}

      <VideoPlayer
        open={!!currentVideo}
        video={currentVideo}
        token={token}
        onClose={() => setCurrentVideo(undefined)}
      />
    </>
  );
};
