import './Leaderboard.css';
import { Button, Title } from '@tg-app/ui';
import { useMemo, useState } from 'react';
import { Score, ScoreProps } from '~/components/Leaderboard/Score/Score.tsx';
import { AnalyticsId } from '@tg-app/analytics';
import { ActiveTab } from '~/App.tsx';
import { leaderboardDataMock } from '~/components/Leaderboard/leaderboard-mock.ts';
import { useWallet } from '~/hooks';

type LeaderboardProps = {
  setActiveTab: (tab: ActiveTab) => void;
};
export const Leaderboard = ({ setActiveTab }: LeaderboardProps) => {
  const [leaderboardData, setLeaderboardData] = useState<Omit<ScoreProps, 'rank'>[]>(leaderboardDataMock);

  const { account } = useWallet();

  const userScore: ScoreProps | undefined = useMemo(
    () =>
      leaderboardData
        .sort((a, b) => b.score - a.score)
        .reduce(
          (acc, score, index) => {
            console.log({ acc, score });
            if (acc) return acc;
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

  return (
    <div className="leaderboard">
      <Title weight="2">Leaderboard</Title>

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

      {leaderboardData
        .sort((a, b) => b.score - a.score)
        .map((score, index) => (
          <Score key={index} user={score.user} score={score.score} rank={index + 1} />
        ))}
    </div>
  );
};
