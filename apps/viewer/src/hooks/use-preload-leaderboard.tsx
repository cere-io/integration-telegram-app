import { ColorScheme } from '@vkruglikov/react-telegram-web-app';
import { useEffect, useState } from 'react';
import { useEngagementData } from '~/hooks/use-engagement-data.tsx';
import { EventSource } from '@cere-activity-sdk/events';

export const usePreloadLeaderboard = (
  leaderboardData: any,
  eventSource: EventSource | null,
  campaignId: string | null,
  updateData: (newData: any, originalHtml: string, newHtml: string, key: 'quests' | 'leaderboard') => void,
  theme?: ColorScheme,
) => {
  const [shouldFetch, setShouldFetch] = useState(false);

  useEffect(() => {
    if (leaderboardData === null) {
      setShouldFetch(true);
    }
  }, [leaderboardData]);

  useEngagementData({
    eventSource,
    eventType: 'GET_LEADERBOARD',
    campaignId,
    theme,
    updateData,
    iframeRef: undefined,
  });

  return { shouldFetch };
};
