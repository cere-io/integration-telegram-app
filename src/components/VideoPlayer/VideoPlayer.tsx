import { Card, Modal, ModalProps } from '@tg-app/ui';
import { Video } from '@tg-app/api';
import { useViewport } from '@telegram-apps/sdk-react';
import { VideoPlayer as CerePlayer } from '@cere/media-sdk-react';

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

  url.searchParams.set('source', 'telegram');

  return url.href;
};

export const VideoPlayer = ({ token, video, open = false, onClose }: VideoPlayerProps) => {
  const { width = 0 } = useViewport() || {};

  /**
   * TODO: Properly detect the video aspect ratio
   * TODO: Apply aspect ratio using CSS
   */
  const height = (width / 16) * 9;
  const url = createUrl(video, token);

  return (
    <Modal open={open && !!video && !!token} onOpenChange={(open) => !open && onClose?.()}>
      <Modal.Header>Media Player</Modal.Header>

      <Card className="VideoPlayer-card">
        {url && (
          <CerePlayer
            hlsEnabled={false}
            src={url!}
            type="video/mp4"
            loadingComponent={<div />}
            onFullScreenChange={(fullScreen) => {
              console.log('onFullScreenChange', fullScreen);

              if (fullScreen) {
                document.body.setAttribute('data-video-fullscreen', '1');
              } else {
                document.body.removeAttribute('data-video-fullscreen');
              }
            }}
            videoOverrides={{
              autoPlay: true,
              style: `width: ${width}px; height: ${height}px;` as any,
            }}
          />
        )}

        <Card.Cell readOnly subtitle={video?.description} style={{ paddingBottom: 16 }}>
          {video?.title}
        </Card.Cell>
      </Card>
    </Modal>
  );
};
