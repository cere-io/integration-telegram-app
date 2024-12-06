import { Card, Modal, ModalProps } from '@tg-app/ui';
import { Campaign, Quest, Video } from '@tg-app/api';
import { useViewport } from '@telegram-apps/sdk-react';
import { VideoPlayer as CerePlayer } from '@cere/media-sdk-react';

import './VideoPlayer.css';
import { useBot, useEvents, useWallet } from '../../hooks';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getActiveCampaign } from '@integration-telegram-app/creator/src/helpers';

export type VideoPlayerProps = Pick<ModalProps, 'open'> & {
  video?: Video;
  onClose?: () => void;
};

const createUrl = (video?: Video) => {
  if (!video) {
    return;
  }

  const url = new URL(video.url);

  url.searchParams.set('source', 'telegram');

  return url.href;
};

export const VideoPlayer = ({ video, open = false, onClose }: VideoPlayerProps) => {
  const { width = 0 } = useViewport() || {};
  const { account } = useWallet();
  const eventSource = useEvents();
  const bot = useBot();

  const [activeCampaign, setActiveCampaign] = useState<Campaign>();
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);

  /**
   * TODO: Properly detect the video aspect ratio
   * TODO: Apply aspect ratio using CSS
   */
  const height = (width / 16) * 9;
  const url = createUrl(video);

  useEffect(() => {
    bot.getCampaigns().then((campaigns) => {
      const campaign = getActiveCampaign(campaigns);
      if (campaign) {
        setActiveCampaign(campaign);
        setActiveQuests(campaign.quests);
      }
    });
  }, [bot]);

  const handleSendEvent = useCallback(
    async (eventName: string, payload?: any) => {
      const activityEventPayload = {
        channelId: bot?.startParam,
        videoId: video?.id,
        publicKey: account?.publicKey,
        campaignId: activeCampaign?.id,
        ...payload,
      };
      const activityEvent = new ActivityEvent(eventName, activityEventPayload);

      await eventSource.dispatchEvent(activityEvent);
    },
    [account?.publicKey, activeCampaign?.id, bot?.startParam, eventSource, video?.id],
  );

  const videoRewardPoints = useMemo(() => {
    if (activeQuests.length === 0) {
      return undefined;
    }
    const videoQuest = activeQuests.find((q) => Number(q.videoId) === video?.id);
    if (videoQuest) {
      return videoQuest.rewardPoints;
    }
  }, [activeQuests, video?.id]);

  return (
    <Modal open={open && !!video} onOpenChange={(open) => !open && onClose?.()}>
      <Modal.Header>Media Player</Modal.Header>

      <Card className="VideoPlayer-card">
        {url && (
          <CerePlayer
            hlsEnabled={false}
            src={video!.url}
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
