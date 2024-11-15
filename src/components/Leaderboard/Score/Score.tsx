import './Score.css';
import { useWallet } from '~/hooks';

export type ScoreProps = {
  user: string;
  score: number;
  rank: number;
};
export const Score = ({ user, score, rank }: ScoreProps) => {
  const { account } = useWallet();

  return (
    <div className={`score ${account?.address === user && 'my-score'}`}>
      <div>Rank: {rank}</div>
      <div>User: {user}</div>
      <div>Score: {score}</div>
    </div>
  );
};
