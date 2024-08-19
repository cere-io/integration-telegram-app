import { Card, Modal, ModalProps } from '@tg-app/ui';
import { Video } from '@tg-app/api';
import { VideoPlayer as CerePlayer } from '@cere/media-sdk-react';
import { useViewport } from '@telegram-apps/sdk-react';

/**
* Import the styles for the VideoPlayer component from the media-sdk-react package.
* This is the CSS file that will be used to style the VideoPlayer component.

* TODO: Properly import by package name - not by file path.
*/
import '../../../node_modules/@cere/media-sdk-react/dist/browser.css';

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

export const VideoPlayer = ({ token, video, open = false, onClose }: VideoPlayerProps) => {
  const { width = 0 } = useViewport() || {};

  const url = createUrl(video, token);

  return (
    <Modal open={open && !!video && !!token} onOpenChange={(open) => !open && onClose?.()}>
      <Modal.Header>{video?.name}</Modal.Header>

      <Card style={{ borderRadius: 0 }}>
        <div style={{ width }}>
          {url && (
            <CerePlayer
              hlsEnabled={false}
              src={url!}
              loadingComponent={<div />}
              videoOverrides={{
                autoPlay: true,
              }}
            />
          )}
        </div>
        <Card.Cell readOnly subtitle={video?.description} style={{ paddingBottom: 16 }}>
          {video?.name}
        </Card.Cell>
      </Card>
    </Modal>
  );
};
