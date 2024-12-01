import { Button } from '@tg-app/ui';
import { useState } from 'react';
import VideoUploadForm from '~/components/VideoUploadForm/VideoUploadForm.tsx';
import { Title } from '@telegram-apps/telegram-ui';

type Video = {
  id: number;
  title: string;
  description: string;
  image: string;
  video: string;
};
export const VideoUpload = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [showForm, setShowForm] = useState(false);

  const handleAddVideo = (video: Video) => {
    setVideos([...videos, video]);
    setShowForm(false);
  };

  console.log({ videos });

  return (
    <div style={{ padding: '0 20px' }}>
      <Title weight="2" style={{ marginBottom: 16, marginTop: 16 }}>
        Your videos
      </Title>
      {videos.length === 0 && !showForm ? (
        <Button onClick={() => setShowForm(true)}>Upload your first video</Button>
      ) : showForm ? (
        <VideoUploadForm onSave={handleAddVideo} onCancel={() => setShowForm(false)} />
      ) : (
        <>
          <h3>Your Videos</h3>
          <div>
            {videos.map((video) => (
              <div
                key={video.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 16,
                  border: '1px solid #ccc',
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                <img
                  src={video.image}
                  alt={video.title}
                  style={{
                    width: 50,
                    height: 50,
                    objectFit: 'cover',
                    borderRadius: 4,
                    marginRight: 12,
                  }}
                />
                <div>
                  <h4 style={{ margin: 0, fontSize: 16 }}>{video.title}</h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#666' }}>{video.description}</p>
                </div>
              </div>
            ))}
          </div>
          <Button onClick={() => setShowForm(true)}>Upload another video</Button>
        </>
      )}
    </div>
  );
};
