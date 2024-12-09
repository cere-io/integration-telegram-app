import { useCallback, useEffect, useState } from 'react';
import { Button, MediaListItem, Text } from '@tg-app/ui';
import { Video } from '@tg-app/api';

import { useBot } from '../../hooks';
import { EditVideoModalContent } from '../../components/Videos/EditVideoModalContent.tsx';
import { Modal } from '../../components/Modal';
import './Videos.css';

export const Videos = () => {
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
        if (video.id) {
          await bot.saveVideo(video);
          setVideos((prevVideos) => prevVideos.map((v) => (v.id === video.id ? video : v)));
        } else {
          const newVideo = await bot.saveVideo(video);
          setVideos((prevVideos) => [...prevVideos, newVideo]);
        }
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
          onClose={() => setSelectedVideo(undefined)}
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
