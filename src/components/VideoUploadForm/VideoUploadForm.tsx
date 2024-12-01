import { useState } from 'react';
import { Input, FileInput, Button } from '@tg-app/ui';

type VideoFormProps = {
  onSave: (video: { id: number; title: string; description: string; image: string; video: string }) => void;
  onCancel: () => void;
};

const VideoUploadForm: React.FC<VideoFormProps> = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);

  const handleSave = () => {
    if (!title || !description || !image || !video) {
      alert('All fields are required!');
      return;
    }

    // Пример преобразования файлов в URL для отображения
    const newVideo = {
      id: Date.now(),
      title,
      description,
      image: URL.createObjectURL(image),
      video: URL.createObjectURL(video),
    };
    onSave(newVideo);
  };

  return (
    <div>
      <h3>Upload Video</h3>
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <FileInput accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)}>
        Upload Image
      </FileInput>
      <FileInput accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] || null)}>
        Upload Video
      </FileInput>
      <div>
        <Button onClick={handleSave}>Save</Button>
        <Button onClick={onCancel} style={{ marginLeft: 10 }}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default VideoUploadForm;
