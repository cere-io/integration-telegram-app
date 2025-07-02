import './Media.css';

import Analytics from '@tg-app/analytics';
import { Loader, MediaList, MediaListItem, Text, Title } from '@tg-app/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useData } from '~/providers';

import { VideoPlayer } from '../../components';
import { ENGAGEMENT_TIMEOUT_DURATION } from '../../constants.ts';
import { useEvents, useStartParam, useTelegramTextColor } from '../../hooks';
import { Video } from '../../types';

export type MediaTypeProps = {
  videoUrl?: string;
};

export const Media = ({ videoUrl }: MediaTypeProps) => {
  const {
    questData: questsData,
    updateQuestStatus,
    isQuestsLoading,
    error,
    refetchQuestsForTab,
    activeCampaignId,
    disableQuests,
  } = useData();
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video>();
  const [pendingUpdates, setPendingUpdates] = useState<Partial<Video>[]>([]);
  const eventSource = useEvents();
  const { campaignId } = useStartParam();
  const color = useTelegramTextColor();

  const mountTimeRef = useRef<number>(performance.now());
  const [isRendered, setIsRendered] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Add refs to prevent unnecessary refetches
  const hasInitiallyFetched = useRef(false);
  const lastVisibilityRefetch = useRef(0);

  const sortedVideos = videos.sort((a, b) => {
    const completedA = a.completed ?? false;
    const completedB = b.completed ?? false;

    return Number(completedA) - Number(completedB);
  });

  // Mark component as mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Stable refetch function to prevent dependency changes
  const stableRefetch = useCallback(() => {
    if (refetchQuestsForTab && !isQuestsLoading) {
      console.log('Media: Performing refetch');
      refetchQuestsForTab();
    }
  }, [refetchQuestsForTab, isQuestsLoading]);

  // Only refetch once when component mounts and we don't have data
  useEffect(() => {
    if (mounted && !hasInitiallyFetched.current && !questsData && !isQuestsLoading) {
      console.log('Media: Initial fetch on mount');
      hasInitiallyFetched.current = true;
      stableRefetch();
    }
  }, [mounted, questsData, isQuestsLoading, stableRefetch]);

  // Reset initial fetch flag when campaign changes
  useEffect(() => {
    hasInitiallyFetched.current = false;
  }, [activeCampaignId, campaignId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      hasInitiallyFetched.current = false;
    };
  }, []);

  // Handle visibility change with throttling (for tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted) {
        const now = Date.now();
        // Throttle visibility change refetches to once per 30 seconds
        if (now - lastVisibilityRefetch.current > 30000) {
          console.log('Media: Refetch on visibility change');
          lastVisibilityRefetch.current = now;
          stableRefetch();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mounted, stableRefetch]);

  useEffect(() => {
    if (!isRendered) {
      const renderTime = performance.now() - mountTimeRef.current;
      console.log(`Media Tab Loaded: ${renderTime.toFixed(2)}ms`);

      Analytics.transaction('TAB_LOADED', renderTime, { tab: { name: 'MEDIA' } });

      setIsRendered(true);
    }
  }, [isRendered]);

  useEffect(() => {
    // Update videos from quest data
    if (questsData?.quests?.videoTasks) {
      setVideos(questsData.quests.videoTasks);
    }
  }, [questsData?.quests?.videoTasks]);

  useEffect(() => {
    // eslint-disable-next-line prefer-const
    let engagementTimeout: NodeJS.Timeout;

    if (!eventSource) return;

    const handleEngagementEvent = (event: any) => {
      clearTimeout(engagementTimeout);

      if (event?.payload && event.payload.integrationScriptResults[0].data.eventType === 'SEGMENT_WATCHED') {
        const results = event?.payload?.integrationScriptResults;
        const result = results[0];
        const { data } = result;
        const questId = data.questId;
        const rewardPoints = data.rewardPoints;

        console.log('Media: Video segment watched', { questId, rewardPoints });
        setPendingUpdates((prevUpdates) => [...prevUpdates, { videoUrl: questId, completed: true }]);
        updateQuestStatus(questId, 'videoTasks', true, rewardPoints);
      }
    };

    engagementTimeout = setTimeout(() => {
      console.error(`Media Engagement Timeout after ${ENGAGEMENT_TIMEOUT_DURATION}ms`);
      Analytics.exception('ENGAGEMENT_TIMEOUT', {
        event: { type: 'GET_QUESTS' },
        timeout: ENGAGEMENT_TIMEOUT_DURATION,
      });
    }, ENGAGEMENT_TIMEOUT_DURATION);

    eventSource.addEventListener('engagement', handleEngagementEvent);

    return () => {
      clearTimeout(engagementTimeout);
      eventSource.removeEventListener('engagement', handleEngagementEvent);
    };
  }, [eventSource, updateQuestStatus]); // Remove 'videos' dependency

  // Optimize pending updates processing
  useEffect(() => {
    if (!currentVideo && pendingUpdates.length > 0) {
      console.log('Media: Processing pending updates', pendingUpdates);
      setVideos((prevVideos) =>
        prevVideos.map((video) => {
          const update = pendingUpdates.find((update) => update.videoUrl === video.videoUrl);
          return update ? { ...video, ...update } : video;
        }),
      );
      setPendingUpdates([]);
    }
  }, [currentVideo, pendingUpdates]);

  useEffect(() => {
    if (videoUrl && videos.length > 0) {
      const video = videos.find((video) => videoUrl === video?.videoUrl);
      if (video) {
        setCurrentVideo(video);
      }
    }
  }, [videoUrl, videos]);

  // Show loading state only if we're actually loading and don't have any cached data
  const shouldShowLoader = isQuestsLoading && !questsData;

  if (shouldShowLoader) {
    return <Loader size="m" style={{ marginTop: '50%' }} />;
  }

  if (error && !questsData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Text>Error loading videos: {error}</Text>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 65 }}>
      <Title weight="2" style={{ marginLeft: 16, marginTop: 16, color }}>
        Library
      </Title>
      <Text Component="div" style={{ margin: '16px 16px 0 16px', color: 'rgb(113, 118, 132)' }}>
        Explore our growing collection of community videos and earn rewards for watching! Each video watched brings you
        closer to unlocking exclusive prizes!
      </Text>

      <div className="videos-overlay" style={{ position: 'relative' }}>
        <MediaList>
          {sortedVideos.length > 0 ? (
            sortedVideos.map((video, index) => (
              <MediaListItem
                key={index}
                completed={video?.completed || false}
                name={video.title}
                description={video.description}
                thumbnailUrl={video.thumbnailUrl}
                onClick={() => setCurrentVideo(video)}
                rewardPoints={video.points}
              />
            ))
          ) : (
            <div style={{ margin: '16px 16px 0px' }}>
              <Text style={{ color: '#333' }}>No videos available</Text>
            </div>
          )}
        </MediaList>
        {disableQuests && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 100,
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              textAlign: 'center',
              borderRadius: '12px',
            }}
          >
            <div>
              <Title level="2" weight="2" style={{ marginBottom: 8 }}>
                Quest completion is currently unavailable
              </Title>
            </div>
          </div>
        )}
      </div>

      {!!currentVideo && (
        <VideoPlayer open={!!currentVideo} video={currentVideo} onClose={() => setCurrentVideo(undefined)} />
      )}
    </div>
  );
};
