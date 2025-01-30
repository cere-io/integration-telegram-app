import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

type DataContextType = {
  questData: any;
  questsHtml: string;
  leaderboardData: any;
  leaderboardHtml: string;
  updateData: (newData: any, newHtml: string, key: 'quest' | 'leaderboard') => void;
  loadCache: () => void;
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

  const updateData = (newData: any, newHtml: string, key: 'quest' | 'leaderboard') => {
    if (key === 'quest') {
      setQuestData(newData);
      setQuestsHtml(newHtml);
    } else {
      setLeaderboardData(newData);
      setLeaderboardHtml(newHtml);
    }
  };

  useEffect(() => {
    loadCache();
  }, [loadCache]);

  useEffect(() => {
    saveCache();
  }, [questData, questsHtml, leaderboardData, leaderboardHtml, saveCache]);

  return (
    <DataContext.Provider value={{ questData, questsHtml, leaderboardData, leaderboardHtml, updateData, loadCache }}>
      {children}
    </DataContext.Provider>
  );
};
