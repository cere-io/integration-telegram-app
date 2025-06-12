import { WalletStatus } from '@cere/embed-wallet';
import { Campaign, Template } from '@tg-app/rms-service';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { useCereWallet } from '~/cere-wallet';
import { MINI_APP_APP_ID, RULE_SERVICE_URL } from '~/constants';
import { isPreviewMode } from '~/helpers';
import { useRmsService, useStartParam } from '~/hooks';

// Types from useDataServiceApi
type DataServiceConfig = {
  baseUrl: string;
  dataServiceId: string;
};

type LeaderboardResponse = {
  users: Array<{
    user: string;
    points: number;
    rank: number;
    username?: string;
    external_wallet_address?: string;
    quests?: any;
  }>;
};

type QuestsResponse = {
  quests: any;
  accountId: string;
  campaignId: string;
  theme: string;
  campaignName: string;
  campaignDescription: string;
  remainingTime: {
    days: number;
    hours: number;
    minutes: number;
  };
};

const DEFAULT_CONFIG: DataServiceConfig = {
  baseUrl: RULE_SERVICE_URL,
  dataServiceId: MINI_APP_APP_ID,
};

// Mock data for preview mode
const MOCK_LEADERBOARD_DATA: LeaderboardResponse = {
  users: [
    { user: '0x1234567890abcdef1234567890abcdef12345678', points: 1250, rank: 1, username: 'Preview User' },
    { user: '0x2234567890abcdef1234567890abcdef12345678', points: 950, rank: 2, username: 'Alice' },
    { user: '0x3234567890abcdef1234567890abcdef12345678', points: 850, rank: 3, username: 'Bob' },
    { user: '0x4234567890abcdef1234567890abcdef12345678', points: 720, rank: 4, username: 'Charlie' },
    { user: '0x5234567890abcdef1234567890abcdef12345678', points: 680, rank: 5, username: 'Diana' },
  ],
};

const MOCK_QUESTS_DATA: QuestsResponse = {
  quests: {
    videoTasks: [
      {
        id: 'video-1',
        title: 'Watch Introduction Video',
        description: 'Learn about the project basics',
        videoUrl: 'https://example.com/video1.mp4',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        points: 100,
        completed: false,
        type: 'video',
      },
      {
        id: 'video-2',
        title: 'Advanced Features Overview',
        description: 'Deep dive into advanced functionality',
        videoUrl: 'https://example.com/video2.mp4',
        thumbnailUrl: 'https://example.com/thumb2.jpg',
        points: 150,
        completed: true,
        type: 'video',
      },
    ],
    socialTasks: [
      {
        id: 'social-1',
        title: 'Follow on Twitter',
        description: 'Follow our official Twitter account',
        tweetId: '1234567890',
        points: 50,
        completed: false,
        type: 'social',
      },
    ],
    dexTasks: [],
    quizTasks: [
      {
        id: 'quiz-1',
        title: 'Knowledge Quiz',
        description: 'Test your understanding',
        quizId: 'quiz-123',
        points: 200,
        completed: false,
        type: 'quiz',
      },
    ],
    referralTask: {
      id: 'referral-1',
      title: 'Invite Friends',
      description: 'Invite friends to join the campaign',
      message: 'Join this amazing campaign! Use my link: {link}',
      points: 300,
      completed: false,
      type: 'referral',
    },
    customTasks: [],
  },
  accountId: '0x1234567890abcdef1234567890abcdef12345678',
  campaignId: '115',
  theme: 'dark',
  campaignName: 'Preview Campaign',
  campaignDescription: 'This is a preview of the campaign interface',
  remainingTime: {
    days: 15,
    hours: 8,
    minutes: 32,
  },
};

type DataContextType = {
  questData: any;
  leaderboardData: any;
  activeCampaignId: string | null;
  campaignConfig: Campaign | null;
  campaignConfigLoaded: boolean;
  campaignExpired: boolean;
  campaignPaused: boolean;
  isLeaderboardLoading: boolean;
  isQuestsLoading: boolean;
  error: string | null;
  updateData: (newData: any, key: 'quests' | 'leaderboard') => void;
  loadCache: () => void;
  updateQuestStatus: (questId: string, taskType: string, newStatus: boolean, points: number) => void;
  refetchQuestsForTab: () => void;
  refetchLeaderboardForTab: () => void;
  setQuestsData: (data: any) => void;
  debugMode: boolean;
  walletStatus: WalletStatus | null;
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
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [questData, setQuestData] = useState<any | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<any | null>(null);
  const [isCampaignExpired, setIsCampaignExpired] = useState(false);
  const [isCampaignPaused, setIsCampaignPaused] = useState(false);
  const [isDebugMode, setDebugMode] = useState(false);
  const [walletStatus, setWalletStatus] = useState(null);

  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [isQuestsLoading, setIsQuestsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialQuestsHtmlRef = useRef<string | null>(null);
  const initialLeaderboardHtmlRef = useRef<any | null>(null);

  const previousQuestData = useRef<any | null>(null);
  const previousLeaderboardData = useRef<any | null>(null);

  // Refs to track if we've already fetched data
  const hasFetchedLeaderboard = useRef(false);
  const hasFetchedQuests = useRef(false);

  const { organizationId, campaignId } = useStartParam();
  const rmsService = useRmsService();
  const cereWallet = useCereWallet();

  const currentCampaignId = campaignId || activeCampaignId;

  useEffect(() => {
    const unsubscribe = cereWallet.subscribe('status-update', setWalletStatus);

    return () => unsubscribe();
  }, [cereWallet]);

  const saveCache = useCallback(async () => {
    if (!campaignKey) return;

    if (questData !== null && questData !== previousQuestData.current) {
      localStorage.setItem(`${campaignKey}_quest_data`, JSON.stringify(questData));
      previousQuestData.current = questData;
    }
    if (leaderboardData !== null && leaderboardData !== previousLeaderboardData.current) {
      localStorage.setItem(`${campaignKey}_leaderboard`, JSON.stringify(leaderboardData));
      previousLeaderboardData.current = leaderboardData;
    }
  }, [campaignKey, questData, leaderboardData]);

  // Helper method to compare data and update only if changed
  const updateQuestDataIfChanged = useCallback((newData: any) => {
    setQuestData((prevData: any) => {
      const hasChanged = JSON.stringify(prevData) !== JSON.stringify(newData);
      if (hasChanged || !prevData) {
        return newData;
      }
      return prevData;
    });
  }, []);

  const updateLeaderboardDataIfChanged = useCallback((newData: any) => {
    setLeaderboardData((prevData: any) => {
      const hasChanged = JSON.stringify(prevData) !== JSON.stringify(newData);
      if (hasChanged || !prevData) {
        return newData;
      }
      return prevData;
    });
  }, []);

  // API methods from useDataServiceApi
  const fetchLeaderboard = useCallback(
    async (silent = false) => {
      if (walletStatus !== 'connected') return;

      try {
        const accountId = await cereWallet.getSigner({ type: 'ed25519' }).getAddress();
        if (!organizationId && !activeCampaignId && !accountId) return;

        if (!silent) {
          setIsLeaderboardLoading(true);
        }
        setError(null);

        // Return mock data in preview mode
        if (isPreviewMode()) {
          console.log('Preview mode: returning mock leaderboard data');
          setTimeout(() => {
            updateLeaderboardDataIfChanged(MOCK_LEADERBOARD_DATA);
            if (!silent) {
              setIsLeaderboardLoading(false);
            }
          }, 500); // Simulate network delay
          return;
        }

        const response = await fetch(
          `${DEFAULT_CONFIG.baseUrl}/data-service/${DEFAULT_CONFIG.dataServiceId}/query/get_leaderboard`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              params: {
                campaign_id: currentCampaignId,
                organization_id: organizationId,
                account_id: accountId,
              },
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const resultData = data.result.data.data;

        updateLeaderboardDataIfChanged(resultData);
        // Save to localStorage using existing logic
        saveCache();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
        console.error('Error fetching leaderboard:', err);
      } finally {
        if (!silent) {
          setIsLeaderboardLoading(false);
        }
      }
    },
    [
      walletStatus,
      cereWallet,
      organizationId,
      activeCampaignId,
      currentCampaignId,
      saveCache,
      updateLeaderboardDataIfChanged,
    ],
  );

  const fetchQuests = useCallback(
    async (silent = false) => {
      if (walletStatus !== 'connected') return;
      try {
        const accountId = await cereWallet.getSigner({ type: 'ed25519' }).getAddress();
        if (!organizationId && !activeCampaignId && !accountId) return;

        if (!silent) {
          setIsQuestsLoading(true);
        }
        setError(null);

        // Return mock data in preview mode
        if (isPreviewMode()) {
          console.log('Preview mode: returning mock quests data');
          setTimeout(() => {
            updateQuestDataIfChanged([MOCK_QUESTS_DATA]);
            if (!silent) {
              setIsQuestsLoading(false);
            }
          }, 300); // Simulate network delay
          return;
        }

        const response = await fetch(
          `${DEFAULT_CONFIG.baseUrl}/data-service/${DEFAULT_CONFIG.dataServiceId}/query/get_quests`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              params: {
                campaign_id: currentCampaignId,
                organization_id: organizationId,
                account_id: accountId,
              },
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const resultData = data.result.data.data;

        // Update data only if changed
        updateQuestDataIfChanged(resultData);
        // Save to localStorage using existing logic
        saveCache();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch quests');
        console.error('Error fetching quests:', err);
      } finally {
        if (!silent) {
          setIsQuestsLoading(false);
        }
      }
    },
    [
      walletStatus,
      cereWallet,
      organizationId,
      activeCampaignId,
      currentCampaignId,
      saveCache,
      updateQuestDataIfChanged,
    ],
  );

  // Methods for tab-specific refetch
  const refetchQuestsForTab = useCallback(() => {
    fetchQuests(true); // Silent refetch
  }, [fetchQuests]);

  const refetchLeaderboardForTab = useCallback(() => {
    fetchLeaderboard(true); // Silent refetch
  }, [fetchLeaderboard]);

  // Reset fetch flags when campaign changes
  useEffect(() => {
    hasFetchedLeaderboard.current = false;
    hasFetchedQuests.current = false;
  }, [currentCampaignId]);

  // Auto-fetch when wallet becomes ready
  useEffect(() => {
    if (cereWallet && walletStatus === 'connected' && currentCampaignId) {
      // Only fetch if we haven't already tried for this campaign
      if (!hasFetchedQuests.current) {
        fetchQuests();
        hasFetchedQuests.current = true;
      }

      if (!hasFetchedLeaderboard.current) {
        fetchLeaderboard();
        hasFetchedLeaderboard.current = true;
      }
    }
  }, [cereWallet, walletStatus, currentCampaignId, fetchLeaderboard, fetchQuests]);

  useEffect(() => {
    let isMounted = true;
    const fetchCampaignKey = async () => {
      if (isMounted) {
        setCampaignKey(
          organizationId
            ? `campaign_${campaignId || activeCampaignId}_organization_${organizationId}`
            : `campaign_${campaignId}`,
        );
      }
    };

    fetchCampaignKey();

    return () => {
      isMounted = false;
    };
  }, [activeCampaignId, campaignId, organizationId]);

  useEffect(() => {
    fetchCampaignConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!campaignConfig) return;
    const campaignStatus = JSON.parse(campaignConfig?.formData as unknown as string)?.campaign?.status;
    const debugMode = JSON.parse(campaignConfig?.formData as unknown as string)?.campaign?.debug || false;
    setDebugMode(debugMode);
    if (campaignStatus !== 'paused') {
      if (questData) return;
    }
    prepareDataFromConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignConfig, questData]);

  const fetchCampaignConfig = useCallback(async () => {
    if (!organizationId && !campaignId) return;

    try {
      let campaignResponse: Campaign | undefined = undefined;
      if (organizationId) {
        campaignResponse = await rmsService.getCampaignByOrganizationId(organizationId);
      } else if (campaignId) {
        campaignResponse = await rmsService.getCampaignById(campaignId);
      }

      let templateResponse: Template | undefined = undefined;
      if (!organizationId) {
        templateResponse = await rmsService.getTemplateByCampaignIdAndEventType(
          campaignResponse?.campaignId.toString() ?? '',
          'GET_QUESTS',
        );
      }

      setActiveCampaignId(campaignResponse?.campaignId.toString() || null);

      const response = {
        ...campaignResponse,
        templateHtml: templateResponse?.params || undefined,
      };

      setCampaignConfig(response as Campaign);
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

    setQuestData(parsedData);
    saveCache();
  };

  const parseCampaignData = (response: Campaign) => {
    try {
      const { campaign: formDataCampaign, quests } = JSON.parse(response?.formData as unknown as string);

      const remainingTime = calculateRemainingTime(formDataCampaign.endDate);
      if (!remainingTime) return null;

      if (formDataCampaign.status === 'paused') {
        setIsCampaignPaused(true);
      }

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
    const cachedLeaderboardData = JSON.parse(localStorage.getItem(`${campaignKey}_leaderboard`) || 'null');

    setQuestData(cachedQuestData);
    setLeaderboardData(cachedLeaderboardData);
    setTimeout(() => {}, 0);
  }, [campaignKey]);

  const updateData = (newData: any, key: 'quests' | 'leaderboard') => {
    if (key === 'quests') {
      setQuestData(newData);
    } else {
      setLeaderboardData(newData);
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

      setQuestData(updatedQuestData);
      setLeaderboardData(updatedLeaderboardData);

      await saveCache();
      resetInitialHtmlRefs();
    },
    [leaderboardData, questData, resetInitialHtmlRefs, saveCache],
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

  const setQuestsData = useCallback((data: any) => {
    setQuestData(data);
  }, []);

  return (
    <DataContext.Provider
      value={{
        questData,
        leaderboardData,
        activeCampaignId,
        campaignConfig,
        campaignConfigLoaded: isConfigLoaded,
        campaignExpired: isCampaignExpired,
        campaignPaused: isCampaignPaused,
        updateData,
        loadCache,
        updateQuestStatus,
        debugMode: isDebugMode,
        isLeaderboardLoading,
        isQuestsLoading,
        error,
        refetchQuestsForTab,
        refetchLeaderboardForTab,
        setQuestsData,
        walletStatus,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
