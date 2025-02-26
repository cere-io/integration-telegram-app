import { Loader, Snackbar } from '@tg-app/ui';
import { useEngagementData, useEvents, useStartParam } from '../../hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityEvent } from '@cere-activity-sdk/events';
import { TELEGRAM_APP_URL } from '../../constants.ts';
import { ActiveTab } from '~/App.tsx';
import { useThemeParams } from '@vkruglikov/react-telegram-web-app';
import { ClipboardCheck } from 'lucide-react';
import { useCereWallet } from '../../cere-wallet';
import { useData } from '../../providers';
import { IframeRenderer } from '../../components/IframeRenderer';
import Reporting from '@tg-app/reporting';

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

type ActiveQuestsProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

export const ActiveQuests = ({ setActiveTab }: ActiveQuestsProps) => {
  const { questsHtml, questData, updateData } = useData();

  const lastHtml = useRef(questsHtml);
  const [memoizedQuestsHtml, setMemoizedQuestsHtml] = useState(questsHtml);
  const mountTimeRef = useRef<number>(performance.now());

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

  const getReferralProgramMessage = useCallback(async () => {
    if (!cereWallet) return;
    const accountId = await cereWallet.getSigner({ type: 'ed25519' }).getAddress();
    const invitationLink = `${TELEGRAM_APP_URL}?startapp=${campaignId}_${accountId}`;

    const messageText: string = questData[0].quests.referralTask.message;
    const decodedText = messageText.replace(/\\u[0-9A-Fa-f]{4,}/g, (match) =>
      String.fromCodePoint(parseInt(match.replace('\\u', ''), 16)),
    );
    return decodedText.replace('{link}', invitationLink);
  }, [campaignId, cereWallet, questData]);

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
        return;
      }

      if (event.data.type === 'QUESTION_ANSWERED') {
        if (!eventSource) return;

        const { event_type, timestamp, data } = {
          event_type: 'QUESTION_ANSWERED',
          timestamp: new Date().toISOString(),
          data: JSON.stringify({
            campaign_id: campaignId,
            campaignId: campaignId,
            quizId: event.data.quizId,
            questionId: event.data.questionId,
            answerId: event.data.answerId,
          }),
        };
        const parsedData = JSON.parse(data);

        const activityEvent = new ActivityEvent(event_type, {
          ...parsedData,
          timestamp,
        });

        setTimeout(() => void eventSource.dispatchEvent(activityEvent), 1000);
        return;
      }

      if (event.data.type === 'REFERRAL_LINK_CLICK') {
        const message = await getReferralProgramMessage();
        if (!message) return;
        const tempInput = document.createElement('textarea');
        tempInput.value = message;
        document.body.appendChild(tempInput);
        tempInput.select();
        if (document.execCommand('copy')) {
          setSnackbarMessageIfChanged('Invitation copied to clipboard successfully!');
        } else {
          setSnackbarMessageIfChanged('Failed to copy the invitation.');
        }
        return;
      }

      if (event.data.type === 'REFERRAL_BUTTON_CLICK') {
        const message = await getReferralProgramMessage();
        if (!message) return;
        window.open(`https://t.me/share/url?url=${encodeURIComponent(message)}`);
        return;
      }
    },
    [setActiveTab, eventSource, campaignId, theme, getReferralProgramMessage, setSnackbarMessageIfChanged],
  );

  useEffect(() => {
    window.addEventListener('message', handleIframeClick);

    return () => {
      window.removeEventListener('message', handleIframeClick);
    };
  }, [campaignId, cereWallet, handleIframeClick, setActiveTab, eventSource]);

  const handleIframeLoad = () => {
    const renderTime = performance.now() - mountTimeRef.current;
    console.log(`Active Quests Tab Loaded: ${renderTime.toFixed(2)}ms`);
    Reporting.message(`Active Quests Tab Loaded: ${renderTime.toFixed(2)}`, {
      level: 'info',
      contexts: {
        tabLoadingTime: {
          duration: renderTime,
          unit: 'ms',
        },
      },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {isLoading || memoizedQuestsHtml === '' ? (
        <Loader size="m" />
      ) : (
        <IframeRenderer
          iframeRef={iframeRef}
          title="Active Quests"
          html={memoizedQuestsHtml}
          style={{
            width: '100%',
            height: 'calc(100vh - 74px)',
            border: 'none',
          }}
          onLoad={handleIframeLoad}
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
