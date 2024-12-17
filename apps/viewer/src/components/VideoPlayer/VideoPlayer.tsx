import { Card, Modal, ModalProps } from '@tg-app/ui';
import { useViewport } from '@telegram-apps/sdk-react';
import { VideoPlayer as CerePlayer } from '@cere/media-sdk-react';

import './VideoPlayer.css';
import { useEvents, useStartParam, useWallet } from '../../hooks';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { useCallback } from 'react';
import { Video } from '../../types';

export type VideoPlayerProps = Pick<ModalProps, 'open'> & {
  video?: Video;
  onClose?: () => void;
};

const createUrl = (video?: Video) => {
  if (!video) {
    return;
  }

  const url = new URL(video.videoUrl);

  url.searchParams.set('source', 'telegram');

  return url.href;
};

export const VideoPlayer = ({ video, open = false, onClose }: VideoPlayerProps) => {
  const { width = 0 } = useViewport() || {};
  const { account } = useWallet();
  const eventSource = useEvents();
  const { startParam } = useStartParam();

  /**
   * TODO: Properly detect the video aspect ratio
   * TODO: Apply aspect ratio using CSS
   */
  const height = (width / 16) * 9;
  const url = createUrl(video);

  const handleSendEvent = useCallback(
    async (eventName: string, payload?: any) => {
      if (!eventSource) return;
      const activityEventPayload = {
        campaignId: startParam,
        videoId: video?.videoUrl,
        publicKey: account?.publicKey,
        ...payload,
      };
      const activityEvent = new ActivityEvent(eventName, activityEventPayload);

      await eventSource.dispatchEvent(activityEvent);
    },
    [account?.publicKey, eventSource, startParam, video?.videoUrl],
  );

  const videoRewardPoints = video?.points || 0;

  return (
    <Modal open={open && !!video} onOpenChange={(open) => !open && onClose?.()}>
      <Modal.Header>Media Player</Modal.Header>

      <Card className="VideoPlayer-card">
        {url && (
          <CerePlayer
            hlsEnabled={false}
            src={video!.videoUrl}
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
            onPlay={() => handleSendEvent('VIDEO_PLAY')}
            onPause={() => handleSendEvent('VIDEO_PAUSE')}
            onSeek={(currentTime) => handleSendEvent('VIDEO_SEEK', { currentTime })}
            onEnd={() =>
              handleSendEvent('VIDEO_ENDED', {
                ...(videoRewardPoints && { rewardPoints: videoRewardPoints, type: 'video' }),
              })
            }
          />
        )}

        <Card.Cell readOnly subtitle={video?.description} style={{ paddingBottom: 16 }}>
          {video?.title}
        </Card.Cell>
      </Card>
    </Modal>
  );
};
