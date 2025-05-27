import { Card, Modal, ModalProps } from '@tg-app/ui';
import { VideoPlayer as CerePlayer } from '@cere/media-sdk-react';
import './VideoPlayer.css';
import { SegmentEvent, useEvents, useStartParam, useVideoSegmentTracker } from '../../hooks';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { memo, useCallback, useEffect, useState } from 'react';
import { Video } from '../../types';
import { useWebApp, useExpand } from '@vkruglikov/react-telegram-web-app';
import { VIDEO_SEGMENT_LENGTH } from '../../constants.ts';

export type VideoPlayerProps = Pick<ModalProps, 'open'> & {
  video?: Video;
  onClose?: () => void;
};

const createUrl = (video?: Video) => {
  if (!video) return;
  const url = new URL(video.videoUrl);
  url.searchParams.set('source', 'telegram');
  return url.href;
};

// ENHANCEMENT: Added video loading states for better error handling
type VideoState = 'loading' | 'ready' | 'error' | 'retrying';

export const VideoPlayer = memo(
  ({ video, open = false, onClose }: VideoPlayerProps) => {
    const miniApp = useWebApp();
    const [isExpanded, expand] = useExpand();
    const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);

    // ENHANCEMENT: Error handling & retry logic - Auto-retries failed videos up to 3 times
    const [videoState, setVideoState] = useState<VideoState>('loading');
    const [retryCount, setRetryCount] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // ENHANCEMENT: Force re-render - playerKey to completely reinitialize player on retry
    const [playerKey, setPlayerKey] = useState(0);

    const width = miniApp.viewportWidth || window.innerWidth;
    const eventSource = useEvents();
    const { campaignId } = useStartParam();
    const height = (width / 16) * 9;
    const url = createUrl(video);

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;

    const getInitialTime = useCallback(() => {
      if (!video?.lastWatchedSegment || !VIDEO_SEGMENT_LENGTH) return 0;
      return video.lastWatchedSegment * VIDEO_SEGMENT_LENGTH;
    }, [video?.lastWatchedSegment]);

    // Reset state when video changes
    useEffect(() => {
      const initialTime = getInitialTime();
      setCurrentVideoTime(initialTime);
      setVideoState('loading');
      setError(null);
      setRetryCount(0);
      setPlayerKey((prev) => prev + 1); // Force player re-render
    }, [getInitialTime, video?.videoUrl]);

    // ENHANCEMENT: Error handling & retry logic - Handles video failures with exponential backoff
    const handleVideoError = useCallback(
      (errorMessage: string) => {
        console.error('Video error:', errorMessage);
        setError(errorMessage);
        if (retryCount < MAX_RETRIES) {
          setVideoState('retrying');
          setTimeout(
            () => {
              setRetryCount((prev) => prev + 1);
              setVideoState('loading');
              setError(null);
              setPlayerKey((prev) => prev + 1); // Force player re-render
            },
            RETRY_DELAY * (retryCount + 1),
          );
        } else {
          setVideoState('error');
        }
      },
      [retryCount, MAX_RETRIES, RETRY_DELAY],
    );

    const handleRetryClick = useCallback(() => {
      setRetryCount(0);
      setVideoState('loading');
      setError(null);
      setPlayerKey((prev) => prev + 1); // Force player re-render
    }, []);

    const handleTelegramFullscreen = (isFullscreen: boolean) => {
      if (!isExpanded && isFullscreen) {
        expand?.();
      }
    };

    // ENHANCEMENT: Robust event handling - Try-catch around analytics to prevent breaking playback
    const handleSendEvent = useCallback(
      async (eventName: string, payload?: any) => {
        if (!eventSource) return;

        try {
          const activityEventPayload = {
            campaignId: campaignId,
            campaign_id: campaignId,
            videoId: video?.videoUrl,
            ...payload,
          };
          const activityEvent = new ActivityEvent(eventName, activityEventPayload);
          await eventSource.dispatchEvent(activityEvent);
        } catch (error) {
          console.error('Failed to send event:', eventName, error);
          // Don't break video playback for analytics failures
        }
      },
      [eventSource, campaignId, video?.videoUrl],
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

    // ENHANCEMENT: Smart segment tracking - Only tracks when video is ready and playing >1 second (prevents instant rewards)
    const handleTimeUpdate = (currentTime: number, duration: number) => {
      // Only track segments when video is ready and playing for at least 1 second
      // This prevents immediate reward triggers when video starts
      if (videoState === 'ready' && currentTime > 1) {
        trackSegment(currentTime, duration || 0);
      }
    };

    // Handle when video actually starts playing
    const handleVideoPlay = useCallback(() => {
      console.log('Video started playing');
      setVideoState('ready');
      handleSendEvent('VIDEO_PLAY');
    }, [handleSendEvent]);

    // ENHANCEMENT: Error UI - Error screen with manual retry button
    const renderError = () => (
      <div
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '48px' }}>🎥</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Video Unavailable</div>
        <div style={{ fontSize: '14px', color: '#666', maxWidth: '300px' }}>
          {error || 'This video cannot be played right now. Please try again later.'}
        </div>
        <button
          onClick={handleRetryClick}
          style={{
            padding: '12px 24px',
            backgroundColor: '#9244E0',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    );

    return (
      <Modal open={open && !!video} onOpenChange={(open) => !open && onClose?.()}>
        <Modal.Header>Media Player</Modal.Header>

        <Card className="VideoPlayer-card">
          {videoState === 'error' && renderError()}

          {url && videoState !== 'error' && (
            <div style={{ position: 'relative' }}>
              {/* ENHANCEMENT: Loading overlay - Spinner that appears over the video during loading/retrying */}
              {(videoState === 'loading' || videoState === 'retrying') && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid #f3f3f3',
                        borderTop: '3px solid #9244E0',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    <div style={{ fontSize: '14px', color: 'white' }}>
                      {videoState === 'retrying' ? `Retrying... (${retryCount}/${MAX_RETRIES})` : 'Loading video...'}
                    </div>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                  </div>
                </div>
              )}

              <CerePlayer
                key={playerKey} // Force re-render on retry
                hlsEnabled={false}
                src={url}
                type="video/mp4"
                loadingComponent={<div />}
                currentTime={currentVideoTime}
                onError={() => handleVideoError('Video playback failed')}
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
                  style: `width: 100%; height: ${height}px;` as any,
                }}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handleVideoPlay}
                onEnd={() => handleSendEvent('VIDEO_ENDED')}
              />
            </div>
          )}

          <Card.Cell readOnly subtitle={video?.description} style={{ paddingBottom: 16 }}>
            {video?.title}
          </Card.Cell>
        </Card>
      </Modal>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.video?.videoUrl === nextProps.video?.videoUrl && prevProps.open === nextProps.open;
  },
);
