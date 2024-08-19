import { Card, Modal, ModalProps } from '@tg-app/ui';
import { Video } from '@tg-app/api';
// import { IosVideoPlayer as CerePlayer } from '@cere/media-sdk-react';
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
  const height = video?.width && video?.height ? (video.height / video.width) * width : 0;

  return (
    <Modal open={open && !!video && !!token} onOpenChange={(open) => !open && onClose?.()}>
      <Modal.Header>{video?.name}</Modal.Header>

      <Card style={{ borderRadius: 0 }}>
        {url && (
          <video autoPlay controls height={height} width={width}>
            <source src={url!} type={video?.mimeType} />
          </video>
          // <CerePlayer
          //   hlsEnabled={false}
          //   src={url!}
          //   type={video?.mimeType}
          //   loadingComponent={<div />}
          //   videoOverrides={{
          //     autoPlay: true,
          //   }}
          // />
        )}

        <Card.Cell readOnly subtitle={video?.description} style={{ paddingBottom: 16 }}>
          {video?.name}
        </Card.Cell>
      </Card>
    </Modal>
  );
};
