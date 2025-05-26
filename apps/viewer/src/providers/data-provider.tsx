import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRmsService, useStartParam } from '~/hooks';
import { compileHtml, decodeHtml } from '~/helpers';
import { validateCampaign, validateTemplate, Campaign, Template } from '../schemas/campaign';

type DataContextType = {
  questData: any;
  questsHtml: string;
  leaderboardData: any;
  leaderboardHtml: string;
  campaignConfig: Campaign | null;
  campaignConfigLoaded: boolean;
  campaignExpired: boolean;
  campaignPaused: boolean;
  updateData: (newData: any, originalHtml: string, newHtml: string, key: 'quests' | 'leaderboard') => void;
  loadCache: () => void;
  updateQuestStatus: (questId: string, taskType: string, newStatus: boolean, points: number) => void;
  debugMode: boolean;
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
  const [isCampaignPaused, setIsCampaignPaused] = useState(false);
  const [isDebugMode, setDebugMode] = useState(false);

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
    if (!campaignConfig) return;
    const campaignStatus = JSON.parse(campaignConfig?.formData as unknown as string)?.campaign?.status;
    const debugMode = JSON.parse(campaignConfig?.formData as unknown as string)?.campaign?.debug || false;
    setDebugMode(debugMode);
    if (campaignStatus !== 'paused') {
      if (questData || questsHtml) return;
    }
    prepareDataFromConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignConfig, questData, questsHtml]);

  const fetchCampaignConfig = useCallback(async () => {
    if (!campaignId) return;

    try {
      console.log('Fetching campaign config for ID:', campaignId);

      // Fetch real campaign data
      const [campaignResponse, templateResponse] = await Promise.all([
        rmsService.getCampaignById(campaignId),
        rmsService.getTemplateByCampaignIdAndEventType(campaignId, 'GET_QUESTS'),
      ]);

      if (!campaignResponse) {
        throw new Error('Campaign not found');
      }

      // Validate campaign data
      let validatedCampaign: Campaign;
      try {
        validatedCampaign = validateCampaign(campaignResponse);
        console.log('✅ Campaign data validation passed');
      } catch (validationError) {
        console.error('❌ Campaign validation failed:', validationError);

        // Log detailed validation errors
        if (validationError instanceof Error && 'issues' in validationError) {
          console.error('Validation issues:', (validationError as any).issues);
        }

        // Try to use the data anyway with some defensive fixes
        const safeCampaignData = {
          campaignId: campaignResponse.campaignId || parseInt(campaignId) || 0,
          status: campaignResponse.status || 1,
          startDate: campaignResponse.startDate || new Date().toISOString(),
          endDate: campaignResponse.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          campaignName: campaignResponse.campaignName || 'Untitled Campaign',
          type: campaignResponse.type || null,
          likeId: campaignResponse.likeId || '',
          archive: campaignResponse.archive || 0,
          mobile: campaignResponse.mobile || 0,
          userName: campaignResponse.userName || '',
          modDate: campaignResponse.modDate || '',
          guid: campaignResponse.guid || '',
          formData:
            typeof campaignResponse.formData === 'string'
              ? JSON.parse(campaignResponse.formData)
              : campaignResponse.formData || {
                  campaign: {
                    name: 'Default Campaign',
                    description: 'Campaign data is incomplete',
                    status: 'active',
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    debug: false,
                  },
                  quests: {
                    videoTasks: [],
                    socialTasks: [],
                  },
                  leaderboard: [],
                },
          templateHtml: campaignResponse.templateHtml || '',
        };

        validatedCampaign = safeCampaignData as Campaign;
        console.warn('Using defensively fixed campaign data - app may be unstable');
      }

      // Validate template if available
      let validatedTemplate: Template | undefined = templateResponse;
      if (templateResponse) {
        try {
          validatedTemplate = validateTemplate(templateResponse);
          console.log('✅ Template validation passed');
        } catch (templateError) {
          console.error('❌ Template validation failed:', templateError);

          // Log detailed validation errors
          if (templateError instanceof Error && 'issues' in templateError) {
            console.error('Template validation issues:', (templateError as any).issues);
          }

          // Use the template anyway with defensive fixes
          const safeTemplate = {
            id: templateResponse.id || undefined,
            name: templateResponse.name || 'Default Template',
            type: templateResponse.type || 'GET_QUESTS',
            theme: templateResponse.theme || 'light',
            params: templateResponse.params || '<div>Template content unavailable</div>',
            archived: templateResponse.archived || 0,
            createdAt: templateResponse.createdAt || undefined,
            updatedAt: templateResponse.updatedAt || undefined,
            createdBy: templateResponse.createdBy || undefined,
            updatedBy: templateResponse.updatedBy || undefined,
            guid: templateResponse.guid || undefined,
          };

          validatedTemplate = safeTemplate as Template;
          console.warn('Using defensively fixed template - rendering may have issues');
        }
      }

      const response = {
        ...validatedCampaign,
        templateHtml: validatedTemplate?.params || '',
      };

      setCampaignConfig(response);
      setIsConfigLoaded(true);
    } catch (error) {
      console.error('Error fetching campaign config:', error);

      // Enhanced fallback with proper error handling
      const fallbackCampaign: Campaign = {
        campaignId: parseInt(campaignId) || 0,
        status: 1,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        campaignName: 'Campaign Unavailable',
        type: null,
        likeId: '',
        archive: 0,
        mobile: 0,
        userName: '',
        modDate: '',
        guid: '',
        formData: {
          campaign: {
            name: 'Campaign Unavailable',
            description: 'Unable to load campaign data. Please check your connection and try again.',
            status: 'active' as const,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            debug: true,
          },
          quests: {
            videoTasks: [],
            socialTasks: [],
          },
          leaderboard: [],
        },
        templateHtml: `
          <div style="padding: 20px; text-align: center; font-family: sans-serif; max-width: 400px; margin: 0 auto;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h1 style="color: #333; margin-bottom: 16px;">Campaign Unavailable</h1>
            <p style="color: #666; margin-bottom: 20px;">We're having trouble loading the campaign data.</p>
            <p style="color: #666; margin-bottom: 20px;">Please check your internet connection and try refreshing the page.</p>
            <button onclick="window.location.reload()" style="
              background: #9244E0; 
              color: white; 
              border: none; 
              padding: 12px 24px; 
              border-radius: 8px; 
              cursor: pointer;
              font-size: 14px;
            ">
              Retry Loading
            </button>
            <details style="margin-top: 20px; text-align: left; font-size: 12px;">
              <summary style="cursor: pointer; color: #9244E0;">Show Error Details</summary>
              <pre style="
                background: #f5f5f5; 
                padding: 10px; 
                margin-top: 10px; 
                border-radius: 4px; 
                overflow-x: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
              ">${error instanceof Error ? error.message : String(error)}</pre>
            </details>
          </div>
        `,
      };

      setCampaignConfig(fallbackCampaign);
      setIsConfigLoaded(true);

      // Send error to analytics if available
      try {
        if (window.gtag) {
          window.gtag('event', 'exception', {
            description: `Campaign fetch failed: ${error instanceof Error ? error.message : String(error)}`,
            fatal: false,
          });
        }
      } catch (analyticsError) {
        console.warn('Failed to send error to analytics:', analyticsError);
      }
    }
  }, [campaignId, rmsService]);

  const prepareDataFromConfig = () => {
    if (!campaignConfig) return;
    const parsedData = parseCampaignData(campaignConfig);
    if (!parsedData) return;

    setQuestData([parsedData]);
    const compiledHtml = compileHtml(campaignConfig.templateHtml || '', [parsedData]);
    setQuestData([parsedData]);
    setQuestsHtml(decodeHtml(compiledHtml));
    setQuestsOriginalHtml(campaignConfig.templateHtml || '');
    saveCache();
  };

  const parseCampaignData = (response: Campaign) => {
    try {
      // Handle both string and object formData
      const formDataObj = typeof response.formData === 'string' ? JSON.parse(response.formData) : response.formData;

      const { campaign: formDataCampaign, quests } = formDataObj;

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
    try {
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
    } catch (error) {
      console.error('Error calculating remaining time:', error);
      return null;
    }
  };

  const loadCache = useCallback(async () => {
    if (!campaignKey) return;

    try {
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
    } catch (error) {
      console.error('Error loading cache:', error);
      // Clear potentially corrupted cache
      try {
        localStorage.removeItem(`${campaignKey}_quest_data`);
        localStorage.removeItem(`${campaignKey}_quests_html_template`);
        localStorage.removeItem(`${campaignKey}_quests_original_html`);
        localStorage.removeItem(`${campaignKey}_leaderboard`);
        localStorage.removeItem(`${campaignKey}_leaderboard_html_template`);
        localStorage.removeItem(`${campaignKey}_leaderboard_original_html`);
      } catch (clearError) {
        console.error('Error clearing corrupted cache:', clearError);
      }
    }
  }, [campaignKey]);

  const saveCache = useCallback(async () => {
    if (!campaignKey) return;

    try {
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
    } catch (error) {
      console.error('Error saving to cache:', error);
      // Cache errors shouldn't break the app
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

      try {
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
      } catch (error) {
        console.error('Error updating quest status:', error);
        // Don't throw - let the app continue functioning
      }
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
        campaignPaused: isCampaignPaused,
        updateData,
        loadCache,
        updateQuestStatus,
        debugMode: isDebugMode,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
