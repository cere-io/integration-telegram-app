import { Loader, Snackbar } from '@tg-app/ui';
import { useEngagementData, useEvents, useStartParam } from '../../hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityEvent } from '@cere-activity-sdk/events';
import hbs from 'handlebars';
import { TELEGRAM_APP_URL } from '../../constants.ts';
import { ActiveTab } from '~/App.tsx';
import { useThemeParams } from '@vkruglikov/react-telegram-web-app';
import { ClipboardCheck } from 'lucide-react';
import { useCereWallet } from '../../cere-wallet';
import { useData } from '../../providers';

// eslint-disable-next-line @typescript-eslint/ban-types
function useDebouncedCallback(callback: Function, delay: number) {
  const [timer, setTimer] = useState<any>(null);

  return useCallback(
    (...args: any[]) => {
      if (timer) clearTimeout(timer);
      setTimer(setTimeout(() => callback(...args), delay));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callback, delay],
  );
}

hbs.registerHelper('json', (context) => JSON.stringify(context));

type ActiveQuestsProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

export const ActiveQuests = ({ setActiveTab }: ActiveQuestsProps) => {
  const { questsHtml, updateData } = useData();

  const lastHtml = useRef(questsHtml);
  const [memoizedQuestsHtml, setMemoizedQuestsHtml] = useState(questsHtml);

  useEffect(() => {
    if (lastHtml.current !== questsHtml) {
      lastHtml.current = questsHtml;
      setMemoizedQuestsHtml(questsHtml);
    }
  }, [questsHtml]);

  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const eventSource = useEvents();
  const { campaignId } = useStartParam();
  const cereWallet = useCereWallet();
  const [theme] = useThemeParams();

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const { isLoading } = useEngagementData({
    eventSource,
    eventType: 'GET_QUESTS',
    campaignId,
    theme,
    updateData,
    iframeRef,
  });

  const setSnackbarMessageIfChanged = useDebouncedCallback((newMessage: string) => {
    setSnackbarMessage(newMessage);
  }, 500);

  const handleIframeClick = useCallback(
    async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'VIDEO_QUEST_CLICK') {
        setActiveTab({
          index: 2,
          props: {
            videoUrl: event.data.videoUrl,
          },
        });
      }

      if (event.data.type === 'SOCIAL_QUEST_CLICKED') {
        if (!eventSource) return;

        const { event_type, timestamp, data } = {
          event_type: 'X_REPOST_STARTED',
          timestamp: new Date().toISOString(),
          data: JSON.stringify({
            campaignId: campaignId,
            campaign_id: campaignId,
            tweet_id_original: event.data.tweetId,
            theme,
          }),
        };
        const parsedData = JSON.parse(data);

        const activityEvent = new ActivityEvent(event_type, {
          ...parsedData,
          timestamp,
        });

        void eventSource.dispatchEvent(activityEvent);
      }

      if (!cereWallet) return;
      const accountId = await cereWallet.getSigner({ type: 'ed25519' }).getAddress();
      const invitationLink = `${TELEGRAM_APP_URL}?startapp=${campaignId}_${accountId}`;
      if (event.data.type === 'REFERRAL_LINK_CLICK') {
        navigator.clipboard.writeText(invitationLink);
        setSnackbarMessageIfChanged('Invitation link copied to clipboard successfully!');
      }

      if (event.data.type === 'REFERRAL_BUTTON_CLICK') {
        const text =
          'Hey there, friend! 🎉 I’m excited to invite you to join the Watch-to-Earn campaign where you can earn amazing prizes just by watching! Don’t miss out on this fantastic opportunity to have fun and win big. Ready to jump in? Click the link above to get started and let’s make this an unforgettable experience together! 🌟';
        window.open(`https://t.me/share/url?url=${invitationLink}&text=${text}`);
      }
    },
    [campaignId, cereWallet, setActiveTab, eventSource, setSnackbarMessageIfChanged, theme],
  );

  useEffect(() => {
    window.addEventListener('message', handleIframeClick);

    return () => {
      window.removeEventListener('message', handleIframeClick);
    };
  }, [campaignId, cereWallet, handleIframeClick, setActiveTab, eventSource]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {isLoading || memoizedQuestsHtml === '' ? (
        <Loader size="m" />
      ) : (
        <iframe
          ref={iframeRef}
          srcDoc={memoizedQuestsHtml}
          style={{
            width: '100%',
            height: 'calc(100vh - 74px)',
            border: 'none',
          }}
          title="Active Quests"
        />
      )}
      {snackbarMessage && (
        <Snackbar onClose={() => setSnackbarMessage(null)} duration={5000}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardCheck />
            {snackbarMessage}
          </div>
        </Snackbar>
      )}
    </div>
  );
};
