import { Input, Textarea, Button, Select } from '@tg-app/ui';
import { useEffect, useState } from 'react';
import { Quest, Video } from '@tg-app/api';
import { useBot } from '@integration-telegram-app/viewer/src/hooks';

type ModalProps = {
  isLoading: boolean;
  quest?: Quest;
  onSave?: (quest: Quest) => void;
  onDelete?: (questId: number) => void;
};

export const EditQuestModalContent = ({ quest, onSave, onDelete, isLoading }: ModalProps) => {
  const bot = useBot();

  const [title, setTitle] = useState(quest?.title);
  const [description, setDescription] = useState(quest?.description);
  const [type, setType] = useState(quest?.type || 'video');
  const [videoId, setVideoId] = useState(quest?.videoId);
  const [postUrl, setPostUrl] = useState<string>(quest?.postUrl || '');
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
    onSave?.({
      id: quest?.id,
      title: title!,
      description: description!,
      type: type!,
      videoId: type === 'video' ? videoId : '',
      postUrl: type === 'post_url' ? postUrl : '',
      rewardPoints: rewardPoints!,
    });
  };

  const handleDelete = () => {
    if (quest?.id) {
      onDelete?.(quest.id);
    }
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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        placeholder="I am usual input, just leave me alone"
        onChange={(e) => setType(e.target.value)}
        displayEmpty
      >
        <option value="video">Watch the video</option>
        <option value="post_url">Share post url</option>
      </Select>
      {type === 'video' ? (
        <Select
          header="Video"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          placeholder="I am usual input, just leave me alone"
          onChange={(e) => setVideoId(e.target.value)}
        >
          {videos.map((video) => (
            <option key={video.id} value={video.id}>
              {video.title}
            </option>
          ))}
        </Select>
      ) : (
        <Input
          header="X url"
          placeholder="Paste your X post link here"
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
        />
      )}
      <Input
        header="Reward points"
        placeholder="I am usual input, just leave me alone"
        value={rewardPoints}
        onChange={(e) => setRewardPoints(e.target.value as any)} // @TODO remove any
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
