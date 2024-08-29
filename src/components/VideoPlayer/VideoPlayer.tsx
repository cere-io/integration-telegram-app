import { lazy, Suspense } from 'react';
import { Card, Modal, ModalProps } from '@tg-app/ui';
import { Video } from '@tg-app/api';
import { useViewport } from '@telegram-apps/sdk-react';

import './VideoPlayer.css';

export type VideoPlayerProps = Pick<ModalProps, 'open'> & {
  video?: Video;
  token?: string;
  onClose?: () => void;
};

const createUrl = (video?: Video, token?: string) => {
  if (!video) {
    return;
  }

  const url = new URL(video.url);

  if (token) {
    url.searchParams.set('token', token);
  }

  return url.href;
};

const CerePlayer = lazy(async () => {
  const { VideoPlayer } = await import('@cere/media-sdk-react');

  return { default: VideoPlayer };
});

export const VideoPlayer = ({ token, video, open = false, onClose }: VideoPlayerProps) => {
  const { width = 0 } = useViewport() || {};

  const url = createUrl(video, token);
  const height = video?.width && video?.height ? (video.height / video.width) * width : 0;

  return (
    <Modal open={open && !!video && !!token} onOpenChange={(open) => !open && onClose?.()}>
      <Modal.Header>{video?.name}</Modal.Header>

      <Card className="VideoPlayer-card">
        <Suspense fallback={<div style={{ width, height }} />}>
          {url && (
            <CerePlayer
              hlsEnabled={false}
              src={url!}
              type={video?.mimeType}
              loadingComponent={<div />}
              videoOverrides={{
                autoPlay: true,
                style: `width: ${width}px; height: ${height}px;` as any,
              }}
            />
          )}
        </Suspense>

        <Card.Cell readOnly subtitle={video?.description} style={{ paddingBottom: 16 }}>
          {video?.name}
        </Card.Cell>
      </Card>
    </Modal>
  );
};
