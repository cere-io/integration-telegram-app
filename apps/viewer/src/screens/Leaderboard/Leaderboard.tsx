import './Leaderboard.css';
import { Snackbar, Loader, truncateText } from '@tg-app/ui';
import { useEffect, useRef, useState } from 'react';
import { useStartParam, useEvents, useEngagementData } from '../../hooks';
import { ActiveTab } from '~/App.tsx';
import { ClipboardCheck } from 'lucide-react';
import { useThemeParams } from '@vkruglikov/react-telegram-web-app';
import { useData } from '../../providers';
import { IframeRenderer } from '../../components/IframeRenderer';
import Reporting from '@tg-app/reporting';

type LeaderboardProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

export const Leaderboard = ({ setActiveTab }: LeaderboardProps) => {
  const { leaderboardHtml, updateData } = useData();

  const lastHtml = useRef(leaderboardHtml);
  const [memoizedLeaderboardHtml, setMemoizedLeaderboardHtml] = useState(leaderboardHtml);
  const mountTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    if (lastHtml.current !== leaderboardHtml) {
      lastHtml.current = leaderboardHtml;
      setMemoizedLeaderboardHtml(leaderboardHtml);
    }
  }, [leaderboardHtml]);

  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const eventSource = useEvents();

  const [theme] = useThemeParams();
  const { campaignId } = useStartParam();

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const { isLoading } = useEngagementData({
    eventSource,
    eventType: 'GET_LEADERBOARD',
    campaignId,
    theme,
    updateData,
    iframeRef,
  });

  useEffect(() => {
    const handleIframeClick = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'LEADERBOARD_ROW_CLICK') {
        const publicKey = event.data.publicKey;

        try {
          const tempInput = document.createElement('textarea');
          tempInput.value = publicKey;
          document.body.appendChild(tempInput);
          tempInput.select();

          if (document.execCommand('copy')) {
            setSnackbarMessage(
              `Public key ${truncateText({ text: publicKey, maxLength: 12 })} copied to clipboard successfully!`,
            );
          } else {
            setSnackbarMessage(
              `Failed to copy the public key. Please copy manually: ${truncateText({ text: publicKey, maxLength: 12 })}`,
            );
          }

          document.body.removeChild(tempInput);
        } catch (error) {
          console.error('Failed to copy the public key:', error);
          setSnackbarMessage(
            `Clipboard is not supported. Public key: ${truncateText({ text: publicKey, maxLength: 12 })}.`,
          );
        }
      }

      if (event.data.type === 'VIDEO_QUEST_CLICK') {
        setActiveTab({
          index: 2,
          props: {
            videoUrl: event.data.videoUrl,
          },
        });
      }
      if (event.data.type === 'QUEST_CLICKED') {
        setActiveTab({
          index: 0,
        });
      }
    };
    window.addEventListener('message', handleIframeClick);

    return () => {
      window.removeEventListener('message', handleIframeClick);
    };
  }, [setActiveTab]);

  const handleIframeLoad = () => {
    const renderTime = performance.now() - mountTimeRef.current;
    console.log(`Leaderboard Tab Loaded: ${renderTime.toFixed(2)}ms`);
    Reporting.message(`Leaderboard Tab Loaded: ${renderTime.toFixed(2)}`, {
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
    <div className="leaderboard" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {isLoading ? (
        <Loader size="m" />
      ) : (
        <IframeRenderer
          iframeRef={iframeRef}
          allow="clipboard-read; clipboard-write"
          html={memoizedLeaderboardHtml}
          style={{ width: '100%', height: 'calc(100vh - 75px)', border: 'none' }}
          title="Leaderboard"
          onLoad={handleIframeLoad}
        />
      )}
      {snackbarMessage && (
        <Snackbar onClose={() => setSnackbarMessage(null)} duration={5000}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <ClipboardCheck />
            {snackbarMessage}
          </div>
        </Snackbar>
      )}
    </div>
  );
};
