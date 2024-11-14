import './Leaderboard.css';
import { Button, Spinner, Title } from '@tg-app/ui';
import { useEffect, useMemo, useState } from 'react';
import { Score, ScoreProps } from '~/components/Leaderboard/Score/Score.tsx';
import { AnalyticsId } from '@tg-app/analytics';
import { ActiveTab } from '~/App.tsx';
import { leaderboardDataMock } from '~/components/Leaderboard/leaderboard-mock.ts';
import { useEvents, useWallet } from '~/hooks';

type LeaderboardProps = {
  setActiveTab: (tab: ActiveTab) => void;
};
export const Leaderboard = ({ setActiveTab }: LeaderboardProps) => {
  const [leaderboardData, setLeaderboardData] = useState<Omit<ScoreProps, 'rank'>[]>([]);
  const [isLoading, setLoading] = useState(false);

  const { account } = useWallet();
  const eventSource = useEvents();

  const userScore: ScoreProps | undefined = useMemo(
    () =>
      leaderboardData
        .sort((a, b) => b.score - a.score)
        .reduce(
          (acc, score, index) => {
            if (acc) return acc;
            // if (score.user === '0x002...') {
            if (score.user === account?.address) {
              return {
                ...score,
                rank: index + 1,
              };
            }
            return undefined;
          },
          undefined as ScoreProps | undefined,
        ),
    [account?.address, leaderboardData],
  );

  useEffect(() => {
    setLoading(true);

    eventSource.isReady().then(
      (ready) => {
        console.log('EventSource ready:', ready);
        // TODO send GET_LEADERBOARD event
      },
      (error) => {
        console.error('EventSource error:', error);
      },
    );

    // TODO listen to LEADERBOARD event with data from elastic search
    setTimeout(() => {
      setLeaderboardData(leaderboardDataMock);
      setLoading(false);
    }, 500);
  }, [eventSource]);

  return (
    <div className="leaderboard">
      <Title weight="2">Leaderboard</Title>

      {isLoading ? (
        <Spinner size="l" />
      ) : (
        <>
          {userScore ? (
            <Score user={userScore.user} score={userScore.score} rank={userScore.rank} />
          ) : (
            <div className="cta-button-wrapper">
              <Button
                mode="cta"
                size="l"
                className={AnalyticsId.premiumBtn}
                onClick={() => setActiveTab({ index: 1, props: { showSubscribe: true } })}
              >
                Subscribe and start getting up to the top
              </Button>
            </div>
          )}

          <div>
            {leaderboardData
              .sort((a, b) => b.score - a.score)
              .map((score, index) => (
                <Score key={index} user={score.user} score={score.score} rank={index + 1} />
              ))}
          </div>
        </>
      )}
    </div>
  );
};
