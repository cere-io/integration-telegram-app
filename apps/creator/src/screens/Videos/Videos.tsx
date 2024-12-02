import { useEffect, useState } from 'react';
import { Button, MediaListItem } from '@tg-app/ui';
import { Video } from '../../../../../packages/api';

import { useBot } from '../../hooks';
import type { ActiveTab } from '../../App';
import { EditVideoModalContent } from '../../components/Videos/EditVideoModalContent.tsx';
import { Modal } from '../../components/Modal';

type MediaProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

export const Videos = ({ setActiveTab }: MediaProps) => {
  const bot = useBot();
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video>();

  useEffect(() => {
    bot.getVideos().then((videos) => {
      console.log('GOT VIDEOS');
      console.log(videos);
      setVideos(videos);
    });
  }, [bot]);

  return (
    <div>
      <div className="HIJtihMA8FHczS02iWF5">
        <Button
          mode="filled"
          size="s"
          style={{ alignItems: 'center' }}
          onClick={() => setSelectedVideo({ title: '', description: '', thumbnailUrl: '', url: '' })}
        >
          Add video
        </Button>
      </div>
      {videos.map((video, index) => (
        <MediaListItem
          key={index}
          locked={false}
          loading={false}
          name={video.title}
          description={video.description}
          thumbnailUrl={video.thumbnailUrl}
          onClick={() => setSelectedVideo(video)}
        />
      ))}
      {selectedVideo ? (
        <Modal
          isOpen={true}
          onClose={() => setSelectedVideo(null)}
          content={<EditVideoModalContent video={selectedVideo} />}
        />
      ) : (
        <div></div>
      )}
    </div>
  );
};
