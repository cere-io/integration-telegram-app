import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRmsService, useStartParam } from '~/hooks';
import { compileHtml, decodeHtml } from '~/helpers';
// ENHANCEMENT: Added validation imports for better data integrity
import { validateCampaign, validateTemplate, Campaign, Template } from '../schemas/campaign';
// ENHANCEMENT: Added reporting for error analytics
import Reporting from '@tg-app/reporting';

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

    // ENHANCEMENT: Added comprehensive error handling and safe data extraction
    try {
      // Safely extract campaign status and debug mode
      const formDataObj = safeGetFormData(campaignConfig.formData);
      const campaignStatus = formDataObj?.campaign?.status;
      const debugMode = formDataObj?.campaign?.debug || false;

      setDebugMode(debugMode);

      if (campaignStatus !== 'paused') {
        if (questData || questsHtml) return;
      }
      prepareDataFromConfig();
    } catch (error) {
      console.error('Error processing campaign config:', error);
      prepareDataFromConfig(); // Try anyway
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignConfig, questData, questsHtml]);

  // ENHANCEMENT: Added safe helper function to prevent JSON parsing errors
  const safeGetFormData = (formData: any) => {
    try {
      // If it's null or undefined, return null
      if (formData == null) {
        return null;
      }

      // If it's already an object (not a string), return it directly
      if (typeof formData === 'object' && formData !== null) {
        return formData;
      }

      // If it's a string, try to parse it
      if (typeof formData === 'string') {
        // Check if it's already stringified object notation
        if (formData.trim().startsWith('{') || formData.trim().startsWith('[')) {
          return JSON.parse(formData);
        }
        // If it looks like "[object Object]", it means someone called toString() on an object
        if (formData === '[object Object]') {
          console.warn('Received stringified object notation, cannot parse');
          return null;
        }
        return JSON.parse(formData);
      }

      console.warn('Unexpected formData type:', typeof formData, formData);
      return null;
    } catch (error) {
      console.error('Error parsing formData:', error);
      console.error('FormData value:', formData);
      console.error('FormData type:', typeof formData);
      return null;
    }
  };

  // ENHANCEMENT: Improved cache loading with comprehensive error handling
  const loadCache = useCallback(async () => {
    if (!campaignKey) return;

    try {
      // ENHANCEMENT: Added safe JSON parsing helper for cache data
      const parseJsonSafely = (item: string | null, defaultValue: any = null) => {
        if (!item) return defaultValue;
        try {
          // Don't try to parse if it's already "[object Object]"
          if (item === '[object Object]') {
            console.warn('Detected invalid JSON string in cache:', item);
            return defaultValue;
          }
          return JSON.parse(item);
        } catch (error) {
          console.error('Failed to parse cached JSON:', error, 'Value:', item);
          return defaultValue;
        }
      };

      const cachedQuestData = parseJsonSafely(localStorage.getItem(`${campaignKey}_quest_data`), null);
      const cachedQuestsHtml = localStorage.getItem(`${campaignKey}_quests_html_template`) || '';
      const cachedQuestsOriginalHtml = localStorage.getItem(`${campaignKey}_quests_original_html`) || '';
      const cachedLeaderboardData = parseJsonSafely(localStorage.getItem(`${campaignKey}_leaderboard`), null);
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
    } catch (error) {
      console.error('Error loading cache:', error);
      // ENHANCEMENT: Added cache corruption recovery
      try {
        if (campaignKey) {
          const keysToRemove = [
            `${campaignKey}_quest_data`,
            `${campaignKey}_quests_html_template`,
            `${campaignKey}_quests_original_html`,
            `${campaignKey}_leaderboard`,
            `${campaignKey}_leaderboard_html_template`,
            `${campaignKey}_leaderboard_original_html`,
          ];

          keysToRemove.forEach((key) => {
            localStorage.removeItem(key);
          });
          console.log('Cleared corrupted cache');
        }
      } catch (clearError) {
        console.error('Error clearing corrupted cache:', clearError);
      }
    }
  }, [campaignKey]);

  // ENHANCEMENT: Improved cache saving with safe serialization
  const saveCache = useCallback(async () => {
    if (!campaignKey) return;

    // ENHANCEMENT: Added safe stringification helper
    const safeStringify = (data: any, fallback: string = '') => {
      try {
        if (data === null || data === undefined) return fallback;
        if (typeof data === 'string') return data;
        return JSON.stringify(data);
      } catch (error) {
        console.error('Failed to stringify data for cache:', error);
        return fallback;
      }
    };

    try {
      if (questData !== null && questData !== previousQuestData.current) {
        const serialized = safeStringify(questData);
        if (serialized !== '') {
          localStorage.setItem(`${campaignKey}_quest_data`, serialized);
          previousQuestData.current = questData;
        }
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
        const serialized = safeStringify(leaderboardData);
        if (serialized !== '') {
          localStorage.setItem(`${campaignKey}_leaderboard`, serialized);
          previousLeaderboardData.current = leaderboardData;
        }
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

      console.log('Raw campaign response:', campaignResponse);
      console.log('Raw template response:', templateResponse);

      // ENHANCEMENT: Added comprehensive validation with fallback handling
      let validatedCampaign: Campaign;
      try {
        validatedCampaign = validateCampaign(campaignResponse);
        console.log('✅ Campaign data validation passed');
      } catch (validationError) {
        console.error('❌ Campaign validation failed:', validationError);

        // Create a safe fallback campaign
        validatedCampaign = createSafeCampaign(campaignResponse, campaignId);
        console.warn('Using safe fallback campaign data');
      }

      // ENHANCEMENT: Added template validation with fallback handling
      let validatedTemplate: Template | undefined = undefined;
      if (templateResponse) {
        try {
          console.log('Validating template with type:', templateResponse.type);
          validatedTemplate = validateTemplate(templateResponse);
          console.log('✅ Template validation passed');
        } catch (templateError) {
          console.error('❌ Template validation failed:', templateError);

          // Create safe template
          validatedTemplate = createSafeTemplate(templateResponse);
          console.warn('Using safe fallback template');
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

      // ENHANCEMENT: Added complete fallback campaign creation
      const fallbackCampaign = createFallbackCampaign(campaignId, error);
      setCampaignConfig(fallbackCampaign);
      setIsConfigLoaded(true);

      // ENHANCEMENT: Added analytics error reporting using Reporting
      try {
        Reporting.message(
          `Campaign fetch failed: ${new Error(String(error))}`,
          {
            context: 'campaign_fetch_failed',
            campaignId: campaignId,
          },
          'error',
        );
      } catch (analyticsError) {
        console.warn('Failed to send error to reporting:', analyticsError);
      }
    }
  }, [campaignId, rmsService]);

  // ENHANCEMENT: Added helper to create safe campaign from potentially invalid data
  const createSafeCampaign = (rawCampaign: any, campaignId: string): Campaign => {
    const safeFormData = safeGetFormData(rawCampaign.formData) || {
      campaign: {
        name: rawCampaign.campaignName || 'Untitled Campaign',
        description: 'Campaign data recovered',
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
    };

    return {
      campaignId: Number(rawCampaign.campaignId) || Number(campaignId) || 0,
      status: rawCampaign.status || 1,
      startDate: rawCampaign.startDate || new Date().toISOString(),
      endDate: rawCampaign.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      campaignName: rawCampaign.campaignName || 'Recovered Campaign',
      type: rawCampaign.type || null,
      likeId: rawCampaign.likeId || '',
      archive: rawCampaign.archive || 0,
      mobile: rawCampaign.mobile || 0,
      userName: rawCampaign.userName || '',
      modDate: rawCampaign.modDate || '',
      guid: rawCampaign.guid || '',
      formData: safeFormData,
      templateHtml: rawCampaign.templateHtml || '',
    };
  };

  // ENHANCEMENT: Added helper to create safe template
  const createSafeTemplate = (rawTemplate: any): Template => {
    return {
      id: rawTemplate.id || undefined,
      name: rawTemplate.name || 'Default Template',
      type: 'GET_QUESTS' as const, // Default to GET_QUESTS
      theme: rawTemplate.theme || 'light',
      params:
        rawTemplate.params || '<div><h1>Template Unavailable</h1><p>Template content could not be loaded.</p></div>',
      archived: rawTemplate.archived || 0,
      createdAt: rawTemplate.createdAt || undefined,
      updatedAt: rawTemplate.updatedAt || undefined,
      createdBy: rawTemplate.createdBy || undefined,
      updatedBy: rawTemplate.updatedBy || undefined,
      guid: rawTemplate.guid || undefined,
    };
  };

  // ENHANCEMENT: Added helper to create complete fallback campaign
  const createFallbackCampaign = (campaignId: string, error: any): Campaign => {
    return {
      campaignId: Number(campaignId) || 0,
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
  };

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
      // ENHANCEMENT: Use safe helper instead of direct JSON.parse
      const formDataObj = safeGetFormData(response.formData);

      if (!formDataObj || !formDataObj.campaign) {
        console.error('Invalid formData structure');
        return null;
      }

      const { campaign: formDataCampaign, quests } = formDataObj;

      const remainingTime = calculateRemainingTime(formDataCampaign.endDate);
      if (!remainingTime) return null;

      if (formDataCampaign.status === 'paused') {
        setIsCampaignPaused(true);
      }

      return {
        quests: quests || { videoTasks: [], socialTasks: [] },
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
    // ENHANCEMENT: Added comprehensive error handling for date calculations
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

      // ENHANCEMENT: Added comprehensive error handling for quest status updates
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
