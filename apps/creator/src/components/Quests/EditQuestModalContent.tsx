import { Input, Textarea, Button, Select } from '@tg-app/ui';
import { useEffect, useState } from 'react';
import { Quest, Video } from '@tg-app/api';
import { useBot } from '@integration-telegram-app/viewer/src/hooks';

type ModalProps = {
  isLoading: boolean;
  quest?: Quest;
  onSave?: (video: Video) => void;
  onDelete?: (videoId: number) => void;
};

export const EditQuestModalContent = ({ quest, onSave, onDelete, isLoading }: ModalProps) => {
  const bot = useBot();

  const [title, setTitle] = useState(quest?.title);
  const [description, setDescription] = useState(quest?.description);
  const [type, setType] = useState(quest?.type || 'video');
  const [videoId, setVideoId] = useState(quest?.videoId);
  const [rewardPoints, setRewardPoints] = useState(quest?.rewardPoints);

  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    bot.getVideos().then((videos) => {
      setVideos(videos);
      if (!videoId && videos.length > 0) {
        setVideoId(`${videos[0].id!}`);
      }
    });
  }, [bot, videoId]);

  const handleSave = () => {
    onSave({
      id: quest?.id,
      title: title!,
      description: description!,
      type: type!,
      videoId: videoId!,
      rewardPoints: rewardPoints!,
    });
  };

  const handleDelete = () => {
    onDelete(quest?.id);
  };

  return (
    <>
      <Input
        header="Title"
        placeholder="I am usual input, just leave me alone"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        header="Description"
        placeholder="I am usual input, just leave me alone"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Select
        header="Quest type"
        placeholder="I am usual input, just leave me alone"
        onChange={(e) => setType(e.target.value)}
        displayEmpty
      >
        <option value="video">Watch the video</option>
        <option value="post_x" disabled={true}>
          Share post on X
        </option>
      </Select>
      <Select
        header="Video"
        placeholder="I am usual input, just leave me alone"
        onChange={(e) => setVideoId(e.target.value)}
      >
        {videos.map((video) => (
          <option key={video.id} value={video.id}>
            {video.title}
          </option>
        ))}
      </Select>
      <Input
        header="Reward points"
        placeholder="I am usual input, just leave me alone"
        value={rewardPoints}
        onChange={(e) => setRewardPoints(e.target.value)}
      />
      <Button
        mode="gray"
        size="s"
        style={{ float: 'left' }}
        onClick={handleDelete}
        disabled={!quest?.id}
        loading={isLoading}
      >
        Delete
      </Button>
      <Button mode="filled" size="s" style={{ float: 'right' }} onClick={handleSave} loading={isLoading}>
        Save
      </Button>
    </>
  );
};
