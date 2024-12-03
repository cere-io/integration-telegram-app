import { useCallback, useEffect, useState } from 'react';
import { Button, MediaListItem, Text } from '@tg-app/ui';
import { Video } from '@tg-app/api';

import { useBot } from '../../hooks';
import type { ActiveTab } from '../../App';
import { EditVideoModalContent } from '../../components/Videos/EditVideoModalContent.tsx';
import { Modal } from '../../components/Modal';
import './Videos.css';

type MediaProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

export const Videos = ({ setActiveTab }: MediaProps) => {
  const bot = useBot();
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    bot.getVideos().then((videos) => {
      console.log('GOT VIDEOS');
      console.log(videos);
      setVideos(videos);
    });
  }, [bot]);

  const handleOnVideoSave = useCallback(
    async (video: Video) => {
      setIsLoading(true);
      try {
        await bot.saveVideo(video);
        setVideos((prevVideos) => [...prevVideos, video]);
      } catch (error) {
        console.error('Error saving video:', error);
      } finally {
        setIsLoading(false);
        setSelectedVideo(undefined);
      }
    },
    [bot],
  );

  const handleOnDelete = useCallback(
    async (videoId: number) => {
      setIsLoading(true);
      try {
        await bot.deleteVideo(videoId);
        setVideos((prevVideos) => prevVideos.filter((video) => video.id !== videoId));
      } catch (error) {
        console.error('Error deleting video:', error);
      } finally {
        setIsLoading(false);
        setSelectedVideo(undefined);
      }
    },
    [bot],
  );

  return (
    <div>
      <div className="container">
        <Button
          mode="filled"
          size="s"
          style={{ alignItems: 'center' }}
          onClick={() => setSelectedVideo({ title: '', description: '', thumbnailUrl: '', url: '' })}
        >
          Add video
        </Button>
      </div>
      {videos.length === 0 ? (
        <div className="container">
          <Text>No videos available. Click "Add Video" to get started.</Text>
        </div>
      ) : (
        videos.map((video, index) => (
          <MediaListItem
            key={index}
            locked={false}
            loading={false}
            name={video.title}
            description={video.description}
            thumbnailUrl={video.thumbnailUrl}
            onClick={() => setSelectedVideo(video)}
          />
        ))
      )}
      {selectedVideo && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedVideo(null)}
          content={
            <EditVideoModalContent
              isLoading={isLoading}
              video={selectedVideo}
              onSave={handleOnVideoSave}
              onDelete={handleOnDelete}
            />
          }
        />
      )}
    </div>
  );
};
