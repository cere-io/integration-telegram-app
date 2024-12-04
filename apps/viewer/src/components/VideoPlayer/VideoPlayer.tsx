import { Card, Modal, ModalProps } from '@tg-app/ui';
import { Campaign, Video } from '@tg-app/api';
import { useViewport } from '@telegram-apps/sdk-react';
import { VideoPlayer as CerePlayer } from '@cere/media-sdk-react';

import './VideoPlayer.css';
import { useBot, useEvents, useWallet } from '../../hooks';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { useCallback, useEffect, useState } from 'react';
import { getActiveCampaign } from '@integration-telegram-app/creator/src/helpers';

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
  const { account } = useWallet();
  const eventSource = useEvents();
  const bot = useBot();

  const [activeCampaign, setActiveCampaign] = useState<Campaign>();

  /**
   * TODO: Properly detect the video aspect ratio
   * TODO: Apply aspect ratio using CSS
   */
  const height = (width / 16) * 9;
  const url = video;
  // const url = createUrl(video, token);
  console.log(video);

  useEffect(() => {
    bot.getCampaigns().then((campaigns) => {
      const campaign = getActiveCampaign(campaigns);
      setActiveCampaign(campaign);
    });
  }, [bot]);

  const handleSendEvent = useCallback(
    async (eventName: string, payload?: any) => {
      const activityEventPayload = {
        channelId: bot?.startParam || '-1002433493900',
        videoId: video?.id,
        publicKey: account?.publicKey || '31a4e51cfcc492da79838bd4a2a59d694280e3feada2ff5f811f4916d9fbb0ac',
        campaignId: activeCampaign?.id,
        ...payload,
      };
      const activityEvent = new ActivityEvent(eventName, activityEventPayload);

      await eventSource.dispatchEvent(activityEvent);
    },
    [account?.publicKey, activeCampaign?.id, bot?.startParam, eventSource, video?.id],
  );
  return (
    <Modal open={open && !!video} onOpenChange={(open) => !open && onClose?.()}>
      <Modal.Header>Media Player</Modal.Header>

      <Card className="VideoPlayer-card">
        {url && (
          <CerePlayer
            hlsEnabled={false}
            src={video.url!}
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
            onPlay={() => {
              handleSendEvent('VIDEO_PLAY');
            }}
            onPause={() => handleSendEvent('VIDEO_PAUSE')}
            onSeek={(currentTime) => handleSendEvent('VIDEO_SEEK', { currentTime })}
            onEnd={() => handleSendEvent('VIDEO_ENDED')}
          />
        )}

        <Card.Cell readOnly subtitle={video?.description} style={{ paddingBottom: 16 }}>
          {video?.title}
        </Card.Cell>
      </Card>
    </Modal>
  );
};
