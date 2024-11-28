import { useEffect, useMemo, useState } from 'react';
import { Button, MediaList, MediaListItem, Spinner, Title } from '@tg-app/ui';
import { Video } from '@tg-app/api';
import { AnalyticsId } from '@tg-app/analytics';

import { useBot, useEvents, useToken, useWallet } from '~/hooks';
import { VideoPlayer } from '~/components';
import type { ActiveTab } from '~/App';
import { EVENT_APP_ID } from '~/constants.ts';

type MediaProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

export const Media = ({ setActiveTab }: MediaProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video>();

  const [isLoadingVideos, setLoadingVideos] = useState(true);
  const [isLoadingWatched, setLoadingWatched] = useState(true);
  const isLoading = useMemo(() => isLoadingVideos || isLoadingWatched, [isLoadingVideos, isLoadingWatched]);

  const bot = useBot();
  const { account } = useWallet();
  const { token, loading } = useToken();
  const { eventSource, dispatch } = useEvents();

  const hasSubscribeButton = !token && !loading && !!videos.length;

  useEffect(() => {
    setLoadingVideos(true);
    bot.getVideos().then((videos) => {
      setVideos(videos);
      setLoadingVideos(false);
    });
  }, [bot]);

  useEffect(() => {
    setLoadingWatched(true);
    dispatch('GET_WATCHED_VIDEOS', {
      channelId: bot?.startParam,
      id: '920cbd6e-3ac6-45fc-8b74-05adc5f6387f',
      app_id: EVENT_APP_ID,
      account_id: account?.publicKey,
      publicKey: account?.publicKey,
    });
  }, [account?.publicKey, bot?.startParam, dispatch]);

  useEffect(() => {
    const handleEngagementEvent = (event: any) => {
      if (event?.payload) {
        // const { integrationScriptResults }: EngagementEventData = event.payload;
        // const users: { key: string; doc_count: number }[] = (integrationScriptResults as any)[0]?.users || [];
        // const userPublicKey: string = (integrationScriptResults as any)[0]?.userPublicKey || null;
        // const newData =
        //   users?.map(({ key, doc_count }) => ({
        //     publicKey: key,
        //     score: doc_count,
        //   })) || [];
        setLoadingWatched(false);
      }
    };
    eventSource.addEventListener('engagement', handleEngagementEvent);
    return () => {
      eventSource.removeEventListener('engagement', handleEngagementEvent);
    };
  }, [eventSource]);

  return (
    <div style={{ paddingBottom: hasSubscribeButton ? 62 : 0 }}>
      <Title weight="2" style={{ marginLeft: 16, marginTop: 16 }}>
        Library
      </Title>

      {isLoading ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '90vh',
          }}
        >
          <Spinner size="l" />
        </div>
      ) : (
        <MediaList>
          {videos.map((video, index) => (
            <MediaListItem
              key={index}
              locked={!token}
              loading={loading}
              name={video.title}
              description={video.description}
              thumbnailUrl={video.thumbnailUrl}
              onClick={() => setCurrentVideo(video)}
            />
          ))}
        </MediaList>
      )}

      {hasSubscribeButton && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 'calc(var(--safe_area_inset_bottom) + 80px)',
          }}
        >
          <Button
            mode="cta"
            size="l"
            className={AnalyticsId.premiumBtn}
            onClick={() => setActiveTab({ index: 1, props: { showSubscribe: true } })}
          >
            ⭐ Become a Premium member!
          </Button>
        </div>
      )}

      <VideoPlayer
        open={!!currentVideo}
        video={currentVideo}
        token={token}
        onClose={() => setCurrentVideo(undefined)}
      />
    </div>
  );
};
