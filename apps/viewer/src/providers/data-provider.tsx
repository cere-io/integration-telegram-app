import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useStartParam } from '~/hooks';
import { compileHtml } from '~/helpers';

type DataContextType = {
  questData: any;
  questsHtml: string;
  leaderboardData: any;
  leaderboardHtml: string;
  updateData: (newData: any, originalHtml: string, newHtml: string, key: 'quests' | 'leaderboard') => void;
  loadCache: () => void;
  updateQuestStatus: (questId: string, taskType: string, newStatus: boolean, points: number) => void;
};

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [campaignKey, setCampaignKey] = useState<string | null>(null);
  const [questData, setQuestData] = useState<any | null>(null);
  const [questsHtml, setQuestsHtml] = useState<string>('');
  const [questsOriginalHtml, setQuestsOriginalHtml] = useState<string>('');
  const [leaderboardData, setLeaderboardData] = useState<any | null>(null);
  const [leaderboardHtml, setLeaderboardHtml] = useState<string>('');
  const [leaderboardOriginalHtml, setLeaderboardOriginalHtml] = useState<string>('');

  const initialQuestsHtmlRef = useRef<string | null>(null);
  const initialLeaderboardHtmlRef = useRef<any | null>(null);

  const previousQuestData = useRef<any | null>(null);
  const previousQuestsHtml = useRef<string>('');
  const previousQuestsOriginalHtml = useRef<string>('');
  const previousLeaderboardData = useRef<any | null>(null);
  const previousLeaderboardHtml = useRef<string>('');
  const previousLeaderboardOriginalHtml = useRef<string>('');

  const { campaignId } = useStartParam();

  useEffect(() => {
    let isMounted = true;
    const fetchCampaignKey = async () => {
      if (isMounted) {
        setCampaignKey(`campaign_${campaignId}`);
      }
    };

    fetchCampaignKey();

    return () => {
      isMounted = false;
    };
  }, [campaignId]);

  const loadCache = useCallback(async () => {
    if (!campaignKey) return;

    const cachedQuestData = JSON.parse(localStorage.getItem(`${campaignKey}_quest_data`) || 'null');
    const cachedQuestsHtml = localStorage.getItem(`${campaignKey}_quests_html_template`) || '';
    const cachedQuestsOriginalHtml = localStorage.getItem(`${campaignKey}_quests_original_html`) || '';
    const cachedLeaderboardData = JSON.parse(localStorage.getItem(`${campaignKey}_leaderboard`) || 'null');
    const cachedLeaderboardHtml = localStorage.getItem(`${campaignKey}_leaderboard_html_template`) || '';
    const cachedLeaderboardOriginalHtml = localStorage.getItem(`${campaignKey}_leaderboard_original_html`) || '';

    setQuestData(cachedQuestData);
    setQuestsHtml(cachedQuestsHtml);
    setQuestsOriginalHtml(cachedQuestsOriginalHtml);
    setLeaderboardData(cachedLeaderboardData);
    setLeaderboardHtml(cachedLeaderboardHtml);
    setLeaderboardOriginalHtml(cachedLeaderboardOriginalHtml);

    if (!initialQuestsHtmlRef.current) {
      initialQuestsHtmlRef.current = cachedQuestsHtml;
    }
    if (!initialLeaderboardHtmlRef.current) {
      initialLeaderboardHtmlRef.current = cachedLeaderboardHtml;
    }
  }, [campaignKey]);

  const saveCache = useCallback(async () => {
    if (!campaignKey) return;

    if (questData !== null && questData !== previousQuestData.current) {
      localStorage.setItem(`${campaignKey}_quest_data`, JSON.stringify(questData));
      previousQuestData.current = questData;
    }
    if (questsHtml !== '' && questsHtml !== previousQuestsHtml.current) {
      localStorage.setItem(`${campaignKey}_quests_html_template`, questsHtml);
      previousQuestsHtml.current = questsHtml;
    }
    if (questsOriginalHtml !== '' && questsOriginalHtml !== previousQuestsOriginalHtml.current) {
      localStorage.setItem(`${campaignKey}_quests_original_html`, questsOriginalHtml);
      previousQuestsOriginalHtml.current = questsOriginalHtml;
    }
    if (leaderboardData !== null && leaderboardData !== previousLeaderboardData.current) {
      localStorage.setItem(`${campaignKey}_leaderboard`, JSON.stringify(leaderboardData));
      previousLeaderboardData.current = leaderboardData;
    }
    if (leaderboardHtml !== '' && leaderboardHtml !== previousLeaderboardHtml.current) {
      localStorage.setItem(`${campaignKey}_leaderboard_html_template`, leaderboardHtml);
      previousLeaderboardHtml.current = leaderboardHtml;
    }
    if (leaderboardOriginalHtml !== previousLeaderboardOriginalHtml.current) {
      localStorage.setItem(`${campaignKey}_leaderboard_original_html`, leaderboardOriginalHtml);
      previousLeaderboardOriginalHtml.current = leaderboardOriginalHtml;
    }
  }, [
    questData,
    questsHtml,
    questsOriginalHtml,
    leaderboardData,
    leaderboardHtml,
    leaderboardOriginalHtml,
    campaignKey,
  ]);

  const updateData = (newData: any, originalHtml: string, newHtml: string, key: 'quests' | 'leaderboard') => {
    if (key === 'quests') {
      setQuestData(newData);
      setQuestsHtml(newHtml);
      setQuestsOriginalHtml(originalHtml);
    } else {
      setLeaderboardData(newData);
      setLeaderboardHtml(newHtml);
      setLeaderboardOriginalHtml(originalHtml);
    }
  };

  const resetInitialHtmlRefs = useCallback(() => {
    initialQuestsHtmlRef.current = null;
    initialLeaderboardHtmlRef.current = null;
  }, []);

  const updateQuestStatus = useCallback(
    async (questId: string, taskType: string, newStatus: boolean, points: number) => {
      if (!questData || !leaderboardData) return;

      const updatedQuestData = [
        {
          ...questData[0],
          quests: {
            ...questData[0].quests,
            videoTasks: questData[0].quests?.[taskType].map((quest: any) => {
              if (quest.videoUrl === questId) {
                return { ...quest, completed: newStatus };
              }
              return quest;
            }),
          },
        },
      ];

      const updatedLeaderboardData = [
        {
          ...leaderboardData[0],
          users: [
            ...leaderboardData[0].users.map((user: any) => {
              if (Object.prototype.hasOwnProperty.call(user, 'quests')) {
                return {
                  ...user,
                  points: points ? user.points + points : user.points,
                  quests: {
                    ...user.quests,
                    [taskType]: user.quests[taskType].map((quest: any) =>
                      quest.videoUrl === questId ? { ...quest, completed: newStatus } : quest,
                    ),
                  },
                };
              }
              return user;
            }),
          ],
        },
      ];

      const updatedQuestsHtml = compileHtml(questsOriginalHtml, updatedQuestData);

      const updatedLeaderboardHtml = compileHtml(leaderboardOriginalHtml, updatedLeaderboardData);

      setQuestData(updatedQuestData);
      setQuestsHtml(updatedQuestsHtml);

      setLeaderboardData(updatedLeaderboardData);
      setLeaderboardHtml(updatedLeaderboardHtml);

      await saveCache();
      resetInitialHtmlRefs();
    },
    [leaderboardData, leaderboardOriginalHtml, questData, questsOriginalHtml, resetInitialHtmlRefs, saveCache],
  );

  useEffect(() => {
    if (campaignKey) {
      resetInitialHtmlRefs();
      loadCache();
    }
  }, [campaignKey, loadCache, resetInitialHtmlRefs]);

  useEffect(() => {
    if (campaignKey) {
      saveCache();
    }
  }, [campaignKey, saveCache]);

  return (
    <DataContext.Provider
      value={{
        questData,
        questsHtml: initialQuestsHtmlRef.current || questsHtml,
        leaderboardData,
        leaderboardHtml: initialLeaderboardHtmlRef.current || leaderboardHtml,
        updateData,
        loadCache,
        updateQuestStatus,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
