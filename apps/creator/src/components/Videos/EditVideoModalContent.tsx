import { Input, Textarea, Button } from '@tg-app/ui';
import { useState } from 'react';
import { Video } from '@tg-app/api';
import { useBot } from '@integration-telegram-app/viewer/src/hooks';

type ModalProps = {
  video?: Video;
};

export const EditVideoModalContent = ({ video }: ModalProps) => {
  console.log('VIDEO TO EDIT');
  console.log(video);
  const bot = useBot();

  const [title, setTitle] = useState(video?.title);
  const [description, setDescription] = useState(video?.description);
  const [thumbnailUrl, setThumbnailUrl] = useState(video?.thumbnailUrl);
  const [videoUrl, setVideoUrl] = useState(video?.url);

  const handleSave = () => {
    bot.saveVideo({
      id: video?.id,
      url: videoUrl!,
      title: title!,
      description: description!,
      thumbnailUrl: thumbnailUrl!,
    });
  };

  const handleDelete = () => {
    bot.deleteVideo(video?.id);
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
      <Input
        header="Thumbnail URL"
        placeholder="I am usual input, just leave me alone"
        value={thumbnailUrl}
        onChange={(e) => setThumbnailUrl(e.target.value)}
      />
      <Input
        header="Video URL"
        placeholder="I am usual input, just leave me alone"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
      />
      <Button mode="gray" size="s" style={{ float: 'left' }} onClick={handleDelete} disabled={!video?.id}>
        Delete
      </Button>
      <Button mode="filled" size="s" style={{ float: 'right' }} onClick={handleSave}>
        Save
      </Button>
    </>
  );
};
