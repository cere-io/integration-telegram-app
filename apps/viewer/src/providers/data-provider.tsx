import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

type DataContextType = {
  questData: any;
  questsHtml: string;
  leaderboardData: any;
  leaderboardHtml: string;
  updateData: (newData: any, newHtml: string, key: 'quests' | 'leaderboard') => void;
  loadCache: () => void;
  updateQuestStatus: (questId: string, taskType: string, newStatus: boolean) => void;
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
  const [questData, setQuestData] = useState<any | null>(null);
  const [questsHtml, setQuestsHtml] = useState<string>('');
  const [leaderboardData, setLeaderboardData] = useState<any | null>(null);
  const [leaderboardHtml, setLeaderboardHtml] = useState<string>('');

  const initialQuestsHtmlRef = useRef<string | null>(null);
  const initialLeaderboardHtmlRef = useRef<any | null>(null);

  const previousQuestData = useRef<any | null>(null);
  const previousQuestsHtml = useRef<string>('');
  const previousLeaderboardData = useRef<any | null>(null);
  const previousLeaderboardHtml = useRef<string>('');

  const loadCache = useCallback(() => {
    const cachedQuestData = JSON.parse(localStorage.getItem('quest_data') || 'null');
    const cachedQuestsHtml = localStorage.getItem('quests_html_template') || '';
    const cachedLeaderboardData = JSON.parse(localStorage.getItem('leaderboard') || 'null');
    const cachedLeaderboardHtml = localStorage.getItem('leaderboard_html_template') || '';

    setQuestData(cachedQuestData);
    setQuestsHtml(cachedQuestsHtml);
    setLeaderboardData(cachedLeaderboardData);
    setLeaderboardHtml(cachedLeaderboardHtml);

    if (!initialQuestsHtmlRef.current) {
      initialQuestsHtmlRef.current = cachedQuestsHtml;
    }
    if (!initialLeaderboardHtmlRef.current) {
      initialLeaderboardHtmlRef.current = cachedLeaderboardHtml;
    }
  }, []);

  const saveCache = useCallback(() => {
    if (questData !== null && questData !== previousQuestData.current) {
      localStorage.setItem('quest_data', JSON.stringify(questData));
      previousQuestData.current = questData;
    }
    if (questsHtml !== '' && questsHtml !== previousQuestsHtml.current) {
      localStorage.setItem('quests_html_template', questsHtml);
      previousQuestsHtml.current = questsHtml;
    }
    if (leaderboardData !== null && leaderboardData !== previousLeaderboardData.current) {
      localStorage.setItem('leaderboard', JSON.stringify(leaderboardData));
      previousLeaderboardData.current = leaderboardData;
    }
    if (leaderboardHtml !== '' && leaderboardHtml !== previousLeaderboardHtml.current) {
      localStorage.setItem('leaderboard_html_template', leaderboardHtml);
      previousLeaderboardHtml.current = leaderboardHtml;
    }
  }, [questData, questsHtml, leaderboardData, leaderboardHtml]);

  const updateData = (newData: any, newHtml: string, key: 'quests' | 'leaderboard') => {
    if (key === 'quests') {
      setQuestData(newData);
      setQuestsHtml(newHtml);
    } else {
      setLeaderboardData(newData);
      setLeaderboardHtml(newHtml);
    }
  };

  const updateQuestStatus = useCallback(
    (questId: string, taskType: string, newStatus: boolean) => {
      if (!questData) return;

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

      const updatedQuestDataString = JSON.stringify(updatedQuestData);
      const updatedQuestsHtml =
        questsHtml.split('var TEMPLATE_DATA = JSON.stringify(')[0] +
        `var TEMPLATE_DATA = JSON.stringify(${updatedQuestDataString});` +
        questsHtml.split('var TEMPLATE_DATA = JSON.stringify(')[1].split(');')[1];

      setQuestData(updatedQuestData);
      setQuestsHtml(updatedQuestsHtml);
    },
    [questData, questsHtml],
  );

  useEffect(() => {
    loadCache();
  }, [loadCache]);

  useEffect(() => {
    saveCache();
  }, [questData, questsHtml, leaderboardData, leaderboardHtml, saveCache]);

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
