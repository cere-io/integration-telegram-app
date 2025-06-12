import './ActiveQuests.css';

import Analytics from '@tg-app/analytics';
import { Loader, QuestsList, QuestsListItem, Snackbar, Text, Title } from '@tg-app/ui';
import { ClipboardCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import FlipMove from 'react-flip-move';

import { ActiveTab } from '~/App.tsx';
import { useData } from '~/providers';

import { useStartParam } from '../../hooks';
import { Quests, Task } from '../../types';

type ActiveQuestsProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

export const ActiveQuests = ({ setActiveTab }: ActiveQuestsProps) => {
  const { questData: questsData, isQuestsLoading, error, refetchQuestsForTab, activeCampaignId } = useData();
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [mounted, setMounted] = useState(false);

  const { organizationId, campaignId } = useStartParam();

  // Mark component as mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Silently refetch data when component mounts or becomes visible
  useEffect(() => {
    if (mounted) {
      refetchQuestsForTab();
    }
  }, [mounted, refetchQuestsForTab]);

  // Refetch data when page becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted) {
        refetchQuestsForTab();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mounted, refetchQuestsForTab]);

  const quests: Quests = useMemo(
    () =>
      questsData?.quests || {
        videoTasks: [],
        socialTasks: [],
        dexTasks: [],
        quizTasks: [],
        referralTask: undefined,
        customTasks: [],
      },
    [questsData?.quests],
  );

  const campaignName = questsData?.campaignName || '';
  const campaignDescription = questsData?.campaignDescription || '';
  const accountId = questsData?.accountId || '';

  const remainingTime = useMemo(
    () => questsData?.remainingTime || { days: 0, hours: 0, minutes: 0 },
    [questsData?.remainingTime],
  );

  // Update countdown timer
  useEffect(() => {
    setTimeLeft(remainingTime);

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        const totalMinutes = prevTime.days * 1440 + prevTime.hours * 60 + prevTime.minutes - 1;

        if (totalMinutes <= 0) {
          clearInterval(timer);
          return { days: 0, hours: 0, minutes: 0 };
        }

        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;

        return { days, hours, minutes };
      });
    }, 60000);

    return () => clearInterval(timer);
  }, [remainingTime]);

  // Sort quests by completion status and order
  const sortedQuests = useMemo(() => {
    const {
      videoTasks = [],
      socialTasks = [],
      dexTasks = [],
      quizTasks = [],
      referralTask = undefined,
      customTasks = [],
    } = quests;

    const allTasks: Task[] = [
      ...(videoTasks.map((task, index) => ({ ...task, type: 'video' as const, originalIndex: index })) || []),
      ...(socialTasks.map((task, index) => ({ ...task, type: 'social' as const, originalIndex: index })) || []),
      ...(dexTasks.map((task, index) => ({ ...task, type: 'dex' as const, originalIndex: index })) || []),
      ...(quizTasks.map((task, index) => ({ ...task, type: 'quiz' as const, originalIndex: index })) || []),
      ...(referralTask
        ? [{ ...referralTask, type: 'referral' as const, originalIndex: 0, completed: referralTask.completed ?? false }]
        : []),
      ...(customTasks.map((task, index) => ({ ...task, type: 'custom' as const, originalIndex: index })) || []),
    ];

    const hasOrder = allTasks.some((task) => task.order !== undefined);

    return allTasks.sort((a, b) => {
      if (Boolean(a.completed) !== Boolean(b.completed)) {
        return a.completed ? 1 : -1;
      }

      if (hasOrder) {
        const aOrder = a.order !== undefined ? a.order : Infinity;
        const bOrder = b.order !== undefined ? b.order : Infinity;
        return aOrder - bOrder;
      } else {
        const typeOrder = ['video', 'quiz', 'social', 'dex', 'referral', 'custom'];
        return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
      }
    });
  }, [quests]);

  // Calculate campaign progress - убираем Math.random()
  const campaignProgress = useMemo(() => {
    if (!questsData) return 0;
    // Возвращаем статичное значение вместо Math.random()
    return 65; // Пример: 65% прогресса
  }, [questsData]);

  useEffect(() => {
    if (questsData && mounted) {
      const renderTime = performance.now();
      Analytics.transaction('TAB_LOADED', renderTime, { tab: { name: 'ACTIVE_QUESTS' } });
    }
  }, [questsData, mounted]);

  // Show loading state only if we're actually loading and don't have any cached data
  const shouldShowLoader = isQuestsLoading && !questsData;

  if (shouldShowLoader) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Loader size="m" />
      </div>
    );
  }

  if (error && !questsData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Text>Error loading quests: {error}</Text>
      </div>
    );
  }

  return (
    <div className="active-quests-container">
      <Title weight="1" level="1" className="active-quests-title" style={{ marginLeft: 16, marginTop: 16 }}>
        Complete Quests to Earn!
      </Title>
      {campaignDescription && (
        <Title level="2" className="active-quests-subtitle" style={{ marginLeft: 16, marginTop: 16, marginBottom: 32 }}>
          {campaignDescription}
        </Title>
      )}
      <div className="campaign-info">
        <div className="campaign-header">
          <Text weight="1" className="campaign-title">
            {campaignName}
          </Text>
          <Text className="campaign-time">
            {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
          </Text>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${campaignProgress}%` }} />
        </div>
      </div>
      <QuestsList>
        {sortedQuests.length > 0 ? (
          <FlipMove>
            {sortedQuests.map((quest, idx) => (
              <QuestsListItem
                key={`${idx}_${quest.title}`}
                quest={quest}
                campaignId={Number(campaignId || activeCampaignId)}
                organizationId={Number(organizationId)}
                accountId={accountId}
                remainingDays={remainingTime.days}
                setActiveTab={setActiveTab}
              />
            ))}
          </FlipMove>
        ) : (
          <Text className="no-quests">{isQuestsLoading ? 'Loading quests...' : 'There are no quests yet.'}</Text>
        )}
      </QuestsList>
      {snackbarMessage && (
        <Snackbar onClose={() => setSnackbarMessage(null)} duration={5000}>
          <Title style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardCheck />
            {snackbarMessage}
          </Title>
        </Snackbar>
      )}
    </div>
  );
};
