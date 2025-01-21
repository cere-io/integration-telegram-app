import { Card, Modal, ModalProps } from '@tg-app/ui';
import { VideoPlayer as CerePlayer } from '@cere/media-sdk-react';

import './VideoPlayer.css';
import { SegmentEvent, useEvents, useStartParam, useVideoSegmentTracker } from '../../hooks';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { useCallback, useEffect, useState } from 'react';
import { Video } from '../../types';
import { useWebApp, useExpand } from '@vkruglikov/react-telegram-web-app';
import { VIDEO_SEGMENT_LENGTH } from '../../constants.ts';
import Analytics, { AnalyticsId } from '@tg-app/analytics';

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
  const miniApp = useWebApp();
  const [isExpanded, expand] = useExpand();
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);

  const width = miniApp.viewportWidth || window.innerWidth;

  const eventSource = useEvents();
  const { startParam } = useStartParam();
  /**
   * TODO: Properly detect the video aspect ratio
   * TODO: Apply aspect ratio using CSS
   */
  const height = (width / 16) * 9;
  const url = createUrl(video);

  const getInitialTime = useCallback(() => {
    if (!video?.lastWatchedSegment || !VIDEO_SEGMENT_LENGTH) return 0;
    return video.lastWatchedSegment * VIDEO_SEGMENT_LENGTH;
  }, [video?.lastWatchedSegment]);

  useEffect(() => {
    const initialTime = getInitialTime();
    setCurrentVideoTime(initialTime);
  }, [getInitialTime]);

  const handleTelegramFullscreen = (isFullscreen: boolean) => {
    if (!isExpanded && isFullscreen) {
      expand?.();
    }
  };

  const handleSendEvent = useCallback(
    async (eventName: string, payload?: any) => {
      if (!eventSource) return;
      const activityEventPayload = {
        campaignId: startParam,
        campaign_id: startParam,
        videoId: video?.videoUrl,
        ...payload,
      };
      const activityEvent = new ActivityEvent(eventName, activityEventPayload);

      await eventSource.dispatchEvent(activityEvent);
    },
    [eventSource, startParam, video?.videoUrl],
  );

  const onSegmentWatched = useCallback(
    (event: SegmentEvent) => {
      handleSendEvent('SEGMENT_WATCHED', event);
    },
    [handleSendEvent],
  );

  const trackSegment = useVideoSegmentTracker({
    videoUrl: url!,
    segmentLength: VIDEO_SEGMENT_LENGTH,
    onSegmentWatched,
  });

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    trackSegment(currentTime, duration || 0);
  };

  return (
    <Modal open={open && !!video} onOpenChange={(open) => !open && onClose?.()}>
      <Modal.Header>Media Player</Modal.Header>

      <Card className="VideoPlayer-card">
        {url && (
          <CerePlayer
            hlsEnabled={false}
            src={url}
            type="video/mp4"
            loadingComponent={<div />}
            currentTime={currentVideoTime}
            onFullScreenChange={(fullScreen) => {
              console.log('onFullScreenChange', fullScreen);
              handleTelegramFullscreen(fullScreen);
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
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => handleSendEvent('VIDEO_PLAY')}
            onEnd={() => handleSendEvent('VIDEO_ENDED')}
            onPlay={() => {
              handleSendEvent('VIDEO_PLAY');
              Analytics.trackEvent(AnalyticsId.videoPlay, {
                videoId: video?.videoUrl,
              });
            }}
            onEnd={() => {
              handleSendEvent('VIDEO_ENDED');
              Analytics.trackEvent(AnalyticsId.videoEnded, {
                videoId: video?.videoUrl,
              });
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
