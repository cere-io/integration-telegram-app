import { Modal, ModalProps } from '@tg-app/ui';
import { Video } from '@tg-app/api';
import { VideoPlayer as CerePlayer } from '@cere/media-sdk-react';

import { useToken } from '~/hooks';

export type VideoPlayerProps = Pick<ModalProps, 'open'> & {
  video?: Video;
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

export const VideoPlayer = ({ video, open = false, onClose }: VideoPlayerProps) => {
  const { token } = useToken();
  const url = createUrl(video, token);

  return (
    <Modal
      open={open && !!video}
      header={<Modal.Header>{video?.name}</Modal.Header>}
      onOpenChange={(open) => !open && onClose?.()}
    >
      <div style={{ height: '90vh' }}>{url && <CerePlayer src={url} />}</div>
    </Modal>
  );
};
