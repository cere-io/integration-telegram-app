import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRmsService, useStartParam } from '~/hooks';
import { compileHtml, decodeHtml } from '~/helpers';
import { Campaign } from '@tg-app/rms-service';

type DataContextType = {
  questData: any;
  questsHtml: string;
  leaderboardData: any;
  leaderboardHtml: string;
  campaignConfig: Campaign | null;
  campaignConfigLoaded: boolean;
  campaignExpired: boolean;
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
  const [campaignConfig, setCampaignConfig] = useState<Campaign | null>(null);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [questData, setQuestData] = useState<any | null>(null);
  const [questsHtml, setQuestsHtml] = useState<string>('');
  const [questsOriginalHtml, setQuestsOriginalHtml] = useState<string>('');
  const [leaderboardData, setLeaderboardData] = useState<any | null>(null);
  const [leaderboardHtml, setLeaderboardHtml] = useState<string>('');
  const [leaderboardOriginalHtml, setLeaderboardOriginalHtml] = useState<string>('');
  const [isCampaignExpired, setIsCampaignExpired] = useState(false);

  const initialQuestsHtmlRef = useRef<string | null>(null);
  const initialLeaderboardHtmlRef = useRef<any | null>(null);

  const previousQuestData = useRef<any | null>(null);
  const previousQuestsHtml = useRef<string>('');
  const previousQuestsOriginalHtml = useRef<string>('');
  const previousLeaderboardData = useRef<any | null>(null);
  const previousLeaderboardHtml = useRef<string>('');
  const previousLeaderboardOriginalHtml = useRef<string>('');

  const { campaignId } = useStartParam();
  const rmsService = useRmsService();

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

  useEffect(() => {
    fetchCampaignConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!campaignConfig || questData || questsHtml) return;
    prepareDataFromConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignConfig, questData, questsHtml]);

  const fetchCampaignConfig = useCallback(async () => {
    if (!campaignId) return;

    try {
      const [campaignResponse, templateResponse] = await Promise.all([
        rmsService.getCampaignById(campaignId),
        rmsService.getTemplateByCampaignIdAndEventType(campaignId, 'GET_QUESTS'),
      ]);

      if (!campaignResponse) return;

      const response = {
        ...campaignResponse,
        templateHtml: templateResponse?.params || '',
      };

      setCampaignConfig(response);
      setIsConfigLoaded(true);
    } catch (error) {
      console.error('Error fetching campaign config:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questData]);

  const prepareDataFromConfig = () => {
    if (!campaignConfig) return;
    const parsedData = parseCampaignData(campaignConfig);
    if (!parsedData) return;

    setQuestData([parsedData]);
    const compiledHtml = compileHtml(campaignConfig.templateHtml || '', [parsedData]);
    setQuestData(parsedData);
    setQuestsHtml(decodeHtml(compiledHtml));
    setQuestsOriginalHtml(campaignConfig.templateHtml || '');
    saveCache();
  };

  const parseCampaignData = (response: Campaign) => {
    try {
      const { campaign: formDataCampaign, quests } = JSON.parse(response?.formData as unknown as string);

      const remainingTime = calculateRemainingTime(formDataCampaign.endDate);
      if (!remainingTime) return null;

      return {
        quests,
        campaignId: response.campaignId,
        theme: 'light',
        campaignName: formDataCampaign.name,
        campaignDescription: formDataCampaign.description,
        remainingTime,
        startDate: formDataCampaign.startDate,
        endDate: formDataCampaign.endDate,
      };
    } catch (error) {
      console.error('Error parsing campaign data:', error);
      return null;
    }
  };

  const calculateRemainingTime = (endDateString: string) => {
    const endDate = new Date(endDateString);
    if (isNaN(endDate.getTime())) {
      console.error('Invalid date format:', endDateString);
      return null;
    }

    const remainingMilliseconds = Math.max(endDate.getTime() - Date.now(), 0);

    if (remainingMilliseconds <= 0) {
      setIsCampaignExpired(true);
    }

    return {
      days: Math.floor(remainingMilliseconds / (1000 * 60 * 60 * 24)),
      hours: Math.floor((remainingMilliseconds / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((remainingMilliseconds / (1000 * 60)) % 60),
      seconds: Math.floor((remainingMilliseconds / 1000) % 60),
    };
  };

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
    setTimeout(() => {}, 0);

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
        questsHtml,
        leaderboardData,
        leaderboardHtml,
        campaignConfig,
        campaignConfigLoaded: isConfigLoaded,
        campaignExpired: isCampaignExpired,
        updateData,
        loadCache,
        updateQuestStatus,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
