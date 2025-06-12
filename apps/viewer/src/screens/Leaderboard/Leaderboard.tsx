import './Leaderboard.css';

import Analytics from '@tg-app/analytics';
import {
  CustomModal,
  Loader,
  QuestsModalContent,
  Snackbar,
  Text,
  Truncate,
  truncateText,
  WalletAddressForm,
} from '@tg-app/ui';
import { Title, TopWidget } from '@tg-app/ui';
import { useThemeParams } from '@vkruglikov/react-telegram-web-app';
import { ClipboardCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import FlipMove from 'react-flip-move';

import { ActiveTab } from '~/App.tsx';
import { useData } from '~/providers';

import { useCereWallet } from '../../cere-wallet';
import { LeaderboardUser } from '../../types';
import userIcon from './user-icon.svg';

type LeaderboardProps = {
  setActiveTab: (tab: ActiveTab) => void;
};

type LeaderboardItem =
  | LeaderboardUser
  | {
      placeholder: true;
      start: number;
      end: number;
    };

// Generate leaderboard with placeholders for omitted items
const getNonLinearLeaderboard = (
  sortedUsersWithRank: LeaderboardUser[],
  currentUserIdx: number,
  totalUsers: number,
): LeaderboardItem[] => {
  const blocks: LeaderboardItem[] = [];

  const top3 = sortedUsersWithRank.slice(0, 3);
  blocks.push(...top3);

  if (currentUserIdx > 2) {
    blocks.push({ placeholder: true, start: 4, end: currentUserIdx - 1 });
  }

  const startIdx = Math.max(currentUserIdx - 3, 3);
  const endIdx = Math.min(currentUserIdx + 3, totalUsers - 1);

  for (let i = startIdx; i <= endIdx; i++) {
    const user = sortedUsersWithRank[i];
    if (user) {
      blocks.push(user);
    }
  }

  if (endIdx < totalUsers - 1) {
    blocks.push({ placeholder: true, start: endIdx + 1, end: totalUsers });
  }

  return blocks;
};

export const Leaderboard = ({ setActiveTab }: LeaderboardProps) => {
  const { walletStatus, leaderboardData, isLeaderboardLoading, error, refetchLeaderboardForTab } = useData();
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [expandedRanges, setExpandedRanges] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);

  const [theme] = useThemeParams();

  const cereWallet = useCereWallet();

  // Mark component as mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Silently refetch data when component mounts or becomes visible
  useEffect(() => {
    if (mounted) {
      refetchLeaderboardForTab();
    }
  }, [mounted, refetchLeaderboardForTab]);

  // Refetch data when page becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted) {
        refetchLeaderboardForTab();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mounted, refetchLeaderboardForTab]);

  // Get current user's public key
  const [userPublicKey, setUserPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (walletStatus !== 'connected') return;

    const getUserPublicKey = async () => {
      try {
        const signer = cereWallet.getSigner({ type: 'ed25519' });
        const address = await signer.getAddress();
        setUserPublicKey(address);
      } catch (error) {
        console.error('Error getting user public key:', error);
      }
    };

    getUserPublicKey();
  }, [cereWallet, walletStatus]);

  // Process leaderboard data
  const users = useMemo(() => leaderboardData?.users || [], [leaderboardData?.users]);

  // Sort users by points in descending order and assign ranks
  const sortedUsersWithRank = useMemo(() => {
    return [...users].sort((a, b) => b.points - a.points).map((user, idx) => ({ ...user, rank: idx + 1 }));
  }, [users]);

  // Find the current user's index
  const currentUserIdx = useMemo(() => {
    return sortedUsersWithRank.findIndex(({ user }) => user === userPublicKey);
  }, [sortedUsersWithRank, userPublicKey]);

  // Generate leaderboard data with placeholders
  const leaderboardDisplayData = useMemo(() => {
    return getNonLinearLeaderboard(sortedUsersWithRank, currentUserIdx, users.length);
  }, [sortedUsersWithRank, currentUserIdx, users.length]);

  const handleExpand = useCallback(
    (start: number, end: number) => {
      setExpandedRanges((prev) => ({ ...prev, [`${start}-${end}`]: !prev[`${start}-${end}`] }));
    },
    [setExpandedRanges],
  );

  const handleRowClick = useCallback(async (publicKey: string, isCurrentUser: boolean) => {
    if (isCurrentUser) {
      // Open quest modal for current user
      setModalOpen(true);
      return;
    }

    // Copy public key to clipboard
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
  }, []);

  useEffect(() => {
    if (leaderboardData && mounted) {
      const renderTime = performance.now();
      Analytics.transaction('TAB_LOADED', renderTime, { tab: { name: 'LEADERBOARD' } });
    }
  }, [leaderboardData, mounted]);

  // Current user data for modal
  const currentUserData = useMemo(() => {
    if (userPublicKey && currentUserIdx >= 0) {
      const user = sortedUsersWithRank[currentUserIdx];
      return {
        publicKey: user.user,
        score: user.points,
        rank: user.rank,
        quests: user.quests,
        username: user.username,
        external_wallet_address: user?.external_wallet_address || '',
      };
    }
    return undefined;
  }, [userPublicKey, currentUserIdx, sortedUsersWithRank]);

  // Show loading state only if we're actually loading and don't have any cached data
  const shouldShowLoader = isLeaderboardLoading && !leaderboardData;

  // Create flat array of elements for FlipMove
  const renderLeaderboardItems = useMemo(() => {
    const items: JSX.Element[] = [];

    leaderboardDisplayData.forEach((item, index) => {
      if ('placeholder' in item) {
        const { start, end } = item;
        const isExpanded = expandedRanges[`${start}-${end}`];

        if (isExpanded) {
          const expandedItems = sortedUsersWithRank.slice(start - 1, end);
          const uniqueItems = expandedItems.filter(
            // @TODO remove this filter
            ({ user: publicKey }) =>
              !leaderboardData.some((existingItem: any) => 'user' in existingItem && existingItem.user === publicKey),
          );

          uniqueItems.forEach(({ user: publicKey, points, rank, username }) => {
            items.push(
              <div
                key={`expanded-${publicKey}`}
                className="leaderboardRow"
                onClick={() => handleRowClick(publicKey, publicKey === userPublicKey)}
              >
                <span>{rank}</span>
                <span>{username ? username : publicKey}</span>
                <span>{points}</span>
              </div>,
            );
          });
        } else {
          items.push(
            <div
              style={{ display: 'block', textAlign: 'center' }}
              key={`placeholder-${index}`}
              className="leaderboardRow rowPlaceholder"
              onClick={() => handleExpand(start, end)}
            >
              <span>...</span>
            </div>,
          );
        }
      } else {
        const { user: publicKey, points, rank, username } = item;
        const isLoggedInUser = userPublicKey === publicKey;

        items.push(
          <div
            onClick={() => handleRowClick(publicKey, isLoggedInUser)}
            key={publicKey}
            className={`leaderboardRow ${isLoggedInUser ? 'rowLoggedInUser' : ''}`}
          >
            <Text>{rank}</Text>
            <Text>
              {username ? username : <Truncate maxLength={8} variant="address" text={publicKey} />}
              {isLoggedInUser && <img className="userIcon" src={userIcon} alt="" />}
            </Text>
            <Text>{points}</Text>
          </div>,
        );
      }
    });

    return items;
  }, [
    leaderboardDisplayData,
    expandedRanges,
    sortedUsersWithRank,
    leaderboardData,
    userPublicKey,
    handleRowClick,
    handleExpand,
  ]);

  if (shouldShowLoader) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Loader size="m" />
      </div>
    );
  }

  if (error && !leaderboardData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Error loading leaderboard: {error}</p>
      </div>
    );
  }

  return (
    <div className="leaderboardContainer">
      <TopWidget widgetImage={undefined} /> {/* @TODO add widget image from campaignConfigurator*/}
      <WalletAddressForm
        enable={true}
        // enable={enableRewards}
        userPublicKey={userPublicKey}
        theme={'theme' as 'light' | 'dark'}
        existedWalletAddress={currentUserData?.external_wallet_address}
        addressType={undefined}
        // addressType={(rewards as unknown as Rewards)?.addressType}
        network={undefined}
        // network={(rewards as unknown as Rewards)?.network}
      />
      <div className="leaderboardOverlay">
        <div className="leaderboardContent" data-theme={theme}>
          <div className="tableHeader">
            <Title weight="2" style={{ fontSize: 16 }}>
              Place
            </Title>
            <Title weight="2" style={{ fontSize: 16 }}>
              Users
            </Title>
            <Title weight="2" style={{ fontSize: 16 }}>
              Points
            </Title>
          </div>
          <div className="leaderboardBody">
            <FlipMove>{renderLeaderboardItems}</FlipMove>
          </div>
        </div>
      </div>
      <CustomModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        content={
          <QuestsModalContent
            currentUser={currentUserData}
            onRowClick={handleRowClick}
            widgetImage={undefined}
            setActiveTab={setActiveTab}
          />
        }
      />
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
