import { ActiveTab } from '@integration-telegram-app/viewer/src/App.tsx';
import {
  CustomTask,
  DexTask,
  Quests,
  QuizTask,
  ReferralTask,
  SocialTask,
  VideoTask,
} from '@integration-telegram-app/viewer/src/types';
import { Text } from '@telegram-apps/telegram-ui';
import clsx from 'clsx';

import { Truncate } from '../../Truncate';
import { TopWidget } from '../TopWidget';
import checkMarkIcon from './check-mark-icon.svg';
import styles from './style.module.css';
import userIcon from './user-icon.svg';

function isArrayOfInvitees(val: string[] | number | undefined): val is string[] {
  if (!val) return false;
  return Array.isArray(val);
}

type Props = {
  currentUser?: { publicKey: string; score: number; rank: number; username?: string; quests?: Quests };
  onRowClick: (publicKey: string, isLoggedInUser: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  widgetImage?: string;
};

export const QuestsModalContent = ({ currentUser, onRowClick, widgetImage, setActiveTab }: Props) => {
  const renderPoints = ({
    completed,
    points,
    percents,
  }: {
    completed: boolean;
    points: number;
    percents: number | null;
  }) => {
    if (completed) {
      return (
        <Text>
          <img src={checkMarkIcon} alt="" /> Done
        </Text>
      );
    }
    return (
      <Text style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        {points > 0 && <div>{`+ ${points} Pts`}</div>}
        {!!percents && percents > 0 && <div>{`${percents} %`}</div>}
      </Text>
    );
  };
  if (!currentUser) {
    return null;
  }
  const { quests } = currentUser;

  const allTasks = [
    ...(quests?.videoTasks?.map((task) => ({ ...task, type: 'video' as const })) || []),
    ...(quests?.socialTasks?.map((task) => ({ ...task, type: 'social' as const })) || []),
    ...(quests?.dexTasks?.map((task) => ({ ...task, type: 'dex' as const })) || []),
    ...(quests?.quizTasks.map((task, index) => ({ ...task, type: 'quiz' as const, originalIndex: index })) || []),
    ...(quests?.referralTask ? [{ ...quests?.referralTask, type: 'referral' as const }] : []),
    ...(quests?.customTasks?.map((task) => ({ ...task, type: 'custom' as const })) || []),
  ];

  const completedCount = allTasks.filter((task) => task.completed).length;
  const totalCount = allTasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  let progressText = '';
  if (progress === 0) {
    progressText = 'Start to work';
  } else if (progress < 100) {
    progressText = 'Could do better';
  } else {
    progressText = 'Nice work!';
  }

  const handleOnQuestClick = () => {
    setActiveTab({
      index: 0,
    });
  };

  const handleOnAddressClick = () => {
    onRowClick(currentUser.publicKey, false);
  };

  const renderTask = (task: VideoTask | SocialTask | DexTask | ReferralTask | QuizTask | CustomTask) => {
    const watched = task.completed;

    const getQuizQuestPoints = () => {
      if (task.type !== 'quiz') return 0;
      return task.questions.reduce((prev, question) => Number(prev) + Number(question.points), 0);
    };

    return (
      <div className={styles.questsBoard} key={task.title}>
        <div className={styles.questBlock}>
          {task.type === 'referral' ? (
            <div className={styles.questColumn}>
              <Text className={styles.questTitle}>
                {task.title}{' '}
                <span className={styles.pseudoLink} onClick={handleOnQuestClick}>
                  {task.description}
                </span>
              </Text>
              <Text className={styles.questTitle} style={{ marginTop: '10px' }}>
                Your referrals:{' '}
                <b>{isArrayOfInvitees(task.invitees) ? task.invitees?.length || 0 : task.invitees || 0}</b>
              </Text>
            </div>
          ) : (
            <Text className={styles.questTitle}>
              {task.type !== 'quiz' ? task.title : 'Quiz'}{' '}
              <span className={styles.pseudoLink} onClick={handleOnQuestClick}>
                {task.type !== 'quiz' ? task.description : task.title}
              </span>
            </Text>
          )}

          <div className={clsx(styles.questStatus, watched ? styles.watched : styles.unwatched)}>
            {renderPoints({
              completed: task.completed || false,
              points: task.type === 'quiz' ? getQuizQuestPoints() : task.points || 0,
              percents: task.type === 'referral' ? task.percents : null,
            })}
          </div>
        </div>
      </div>
    );
  };
  return (
    <>
      <TopWidget widgetImage={widgetImage} />
      <div className={styles.topBlock}>
        <Text className={styles.placeBlock}>{currentUser.rank}</Text>
        <Text onClick={handleOnAddressClick}>
          <Truncate
            maxLength={currentUser?.username ? 20 : 10}
            text={currentUser?.username ? currentUser.username : currentUser.publicKey}
          />
          <img className={styles.userIcon} src={userIcon} alt="" />
        </Text>
        <Text style={{ fontWeight: 600 }}>{currentUser.score}</Text>
      </div>
      <div>
        <div className={styles.progress}>
          <div style={{ width: `${progress}%` }} />
        </div>
        <Text className={styles.progressBarText}>
          {completedCount} out of {totalCount} tasks completed – {progressText}
        </Text>
      </div>
      {allTasks.length > 0 && allTasks.map((task) => renderTask(task))}
    </>
  );
};
