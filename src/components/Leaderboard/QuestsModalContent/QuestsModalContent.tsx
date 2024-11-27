import { Truncate, Text, CheckMarkIcon } from '@tg-app/ui';
import './QuestsModalContent.css';
import { Video } from '@tg-app/api';
import { useEffect, useState } from 'react';
import { ActiveTab } from '~/App.tsx';
import { Progress } from '@telegram-apps/telegram-ui';
import { useBot } from '~/hooks';

type Props = {
  currentUser: { publicKey: string; score: number };
  setActiveTab: (tab: ActiveTab) => void;
};

export const QuestsModalContent = ({ currentUser, setActiveTab }: Props) => {
  const bot = useBot();

  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    bot.getVideos().then(setVideos);
  }, [bot]);

  const watchedCount = videos.filter((video) => video.watched).length;
  const totalCount = videos.length;
  const progress = totalCount > 0 ? (watchedCount / totalCount) * 100 : 0;

  return (
    <>
      <div className="top-widget">
        <Text>
          <Truncate maxLength={10} text={currentUser.publicKey} />
        </Text>
        <Text color="white">{currentUser.score}</Text>
      </div>
      <div className="progress-bar-block">
        <Progress value={progress} className="progress-bar" />
        <Text className="progress-bar-text">
          {watchedCount} out of {totalCount} tasks completed – nice work!
        </Text>
      </div>
      {videos.length > 0 &&
        videos.map(({ title, url, watched }) => (
          <div key={url} className="quests-board">
            <div className="quest-block">
              <Text className="quest-title">
                Quick Watch{' '}
                <span
                  className="pseudo-link"
                  onClick={() => setActiveTab({ index: 0, props: { showSubscribe: false } })}
                >
                  {title}
                </span>
              </Text>
              <Text className={`quest-status ${watched ? 'watched' : 'not-watched'}`}>
                {watched ? (
                  <>
                    <CheckMarkIcon /> Done
                  </>
                ) : (
                  '+ 50 Pts'
                )}
              </Text>
            </div>
          </div>
        ))}
    </>
  );
};
