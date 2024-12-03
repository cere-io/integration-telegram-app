import { Input, Textarea, Button } from '@tg-app/ui';
import { useState } from 'react';
import { Video } from '@tg-app/api';

type ModalProps = {
  isLoading: boolean;
  video?: Video;
  onSave?: (video: Video) => void;
  onDelete?: (videoId: number) => void;
};

export const EditVideoModalContent = ({ video, onSave, onDelete, isLoading }: ModalProps) => {
  const [title, setTitle] = useState(video?.title);
  const [description, setDescription] = useState(video?.description);
  const [thumbnailUrl, setThumbnailUrl] = useState(video?.thumbnailUrl);
  const [videoUrl, setVideoUrl] = useState(video?.url);

  const handleSave = () => {
    onSave({
      id: video?.id,
      url: videoUrl!,
      title: title!,
      description: description!,
      thumbnailUrl: thumbnailUrl!,
    });
  };

  const handleDelete = () => {
    onDelete(video?.id);
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
      <Button
        mode="gray"
        size="s"
        style={{ float: 'left' }}
        onClick={handleDelete}
        disabled={!video?.id}
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
