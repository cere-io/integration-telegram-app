import './QuestsListItem.css';

import { ActiveTab } from '@integration-telegram-app/viewer/src/App.tsx';
import { Task, VideoTask } from '@integration-telegram-app/viewer/src/types';
import { Text } from '@telegram-apps/telegram-ui';
import Markdown from 'markdown-to-jsx';
import React, { forwardRef, useCallback, useMemo } from 'react';

import Picture from './assets/refer_a_friend.png';
import { QuizQuest } from './QuizQuest';
import { RepostButton } from './RepostButton';

function isArrayOfInvitees(val: string[] | number): val is string[] {
  if (!val) return false;
  return Array.isArray(val);
}

const CustomLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
};

function formatText(text: string) {
  return (
    <Markdown
      options={{
        overrides: {
          a: {
            component: CustomLink,
          },
        },
      }}
    >
      {text}
    </Markdown>
  );
}

export type QuestsListItemProps = {
  quest: Task;
  remainingDays: number;
  organizationId: number;
  setActiveTab: (tab: ActiveTab) => void;
  accountId?: string;
  campaignId?: number;
};

export const QuestsListItem: React.FC<QuestsListItemProps> = forwardRef<HTMLDivElement, QuestsListItemProps>(
  ({ quest, accountId, campaignId, remainingDays, setActiveTab }, ref) => {
    const handleClick = () => {
      if (quest.type === 'dex') {
        handleOnDexClick();
      } else if (quest.type === 'video') {
        handleOnQuestClick(quest.videoUrl);
      } else if (quest.type === 'custom') {
        window.parent.postMessage({ type: quest.startEvent });
        if (quest.link) {
          window.open(quest.link, '_blank');
        }
      } else {
        handleOnReferralLinkClick();
      }
    };

    const handleOnDexClick = useCallback(() => {
      if (quest.type === 'dex') {
        window.open(quest.tradingLink, '_blank');
      }
    }, [quest]);

    const handleOnQuestClick = (videoUrl: string | undefined) => {
      if (videoUrl && videoUrl !== '') {
        setActiveTab({
          index: 2,
          props: {
            videoUrl,
          },
        });
        window.parent.postMessage({ type: 'VIDEO_QUEST_CLICK', videoUrl });
      }
    };

    const handleOnReferralButtonClick = useCallback(() => {
      window.parent.postMessage({ type: 'REFERRAL_BUTTON_CLICK' });
    }, []);

    const handleOnReferralLinkClick = useCallback(() => {
      window.parent.postMessage({ type: 'REFERRAL_LINK_CLICK' });
    }, []);

    const TwitterIcon = () => (
      <div className="iconBase">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 450 450" fill="none">
          <g transform="translate(50, 0)">
            <path
              d="M178.57 127.15L290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.25h26.46l102.4-116.59 81.8 116.59h89.34M36.01 19.54H76.66l187.13 262.13h-40.66"
              fill="currentColor"
            />
          </g>
        </svg>
      </div>
    );

    const DexIcon = () => (
      <div className="iconBase">
        <svg width="24" height="24" viewBox="0 0 126 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M63 59.3V59.3C65.4 50.2 70.1 41.6 76.3 33.9C72.2 14.3 63.1 0.1 63 0V0L63 0L63 0V0C62.9 0.1 53.8 14.3 49.7 33.9C55.9 41.6 60.6 50.2 63 59.3V59.3L63 59.3Z"
            fill="#111113"
          />
          <path
            d="M14.3 117.7C12.6 125.4 11.6 132 10.8 139.6C19.1 138.1 32.3 134 44.4 120.6C56.5 107.2 60 90.1 60 81.1C60 72.1 59.6 54 43.2 36.6C31.7 24.4 18.7 20.5 11.8 19C24.6 29.5 32 41.4 35.7 57.4C24.2 49.2 9.5 48.4 0.1 51.4C8.1 55.2 14.2 59.5 20.4 66.2C25.5 71.8 29.9 78 33.5 87.7C25.5 90.4 20.9 95.8 18.7 102.2C16.5 108.5 14.3 117.7 14.3 117.7Z"
            fill="#111113"
          />
          <path
            d="M59.9 200C59.3 184.2 52.6 170.9 43.1 161.3C34.7 152.8 22.9 146.9 10.3 145.3C9.8 153.8 10 160.4 10.6 168.6C11.1 176.9 13.4 182.7 18.6 188.5C23.9 194.4 29.6 196.2 33.4 197.3C37.3 198.3 53.5 200.3 59.9 200Z"
            fill="#111113"
          />
          <path
            d="M111.7 117.7C113.4 125.4 114.4 132 115.2 139.6C106.9 138.1 93.7 134 81.6 120.6C69.5 107.2 66 90.1 66 81.1C66 72.1 66.5 54 82.8 36.6C94.3 24.4 107.3 20.5 114.2 19C101.4 29.5 94 41.4 90.3 57.4C101.8 49.2 116.5 48.4 125.9 51.4C117.9 55.2 111.8 59.5 105.6 66.2C100.5 71.8 96.1 78 92.5 87.7C100.5 90.4 105.1 95.8 107.3 102.2C109.5 108.5 111.7 117.7 111.7 117.7Z"
            fill="#111113"
          />
          <path
            d="M66.1 200C66.7 184.2 73.4 170.9 82.9 161.3C91.3 152.8 103.1 146.9 115.7 145.3C116.2 153.8 116 160.4 115.4 168.6C114.9 176.9 112.6 182.7 107.4 188.5C102.1 194.4 96.4 196.2 92.6 197.3C88.7 198.3 72.5 200.3 66.1 200Z"
            fill="#111113"
          />
        </svg>
      </div>
    );

    const renderThumbnail = useMemo(() => {
      if (quest.type === 'video') {
        return <img className="questThumbnail" src={quest.thumbnailUrl} alt="" />;
      }
      if (quest.type === 'social') {
        const questImage = quest?.questImage;
        return questImage ? <img className="questThumbnail" src={questImage} alt={quest.title} /> : <TwitterIcon />;
      }
      if (quest.type === 'dex') {
        return <DexIcon />;
      }
      if (quest.type === 'quiz') return;
      if (quest.type === 'custom' && quest.questImage) {
        return <img className="questThumbnail" src={quest.questImage} alt={quest.title} />;
      }
      if (quest.type === 'referral') {
        return (
          <img
            src={quest?.questImage || Picture}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        );
      }
    }, [quest]);

    const isDisabled = useMemo(() => !accountId || accountId === '0x', [accountId]);

    return (
      <div
        ref={ref}
        className="questCard"
        onClick={() => {
          if (quest.type !== 'video' && quest.type !== 'referral') {
            handleClick();
          }
        }}
      >
        {quest.type === 'quiz' ? (
          <div>
            {quest?.completed && <div className="overlay" />}
            <QuizQuest quizTask={quest} isDisabled={isDisabled} />
          </div>
        ) : (
          <>
            {quest?.completed && <div className="overlay" />}

            <div
              className="questThumbnailBlock"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                if (quest.type === 'video') {
                  handleOnQuestClick((quest as unknown as VideoTask).videoUrl);
                }
              }}
            >
              {renderThumbnail}
              <div className="pointsBlock">
                {quest?.points && quest.points > 0 && (
                  <div className="points">
                    <Text as="span" style={{ whiteSpace: 'nowrap' }}>
                      {quest.points} Pts
                    </Text>
                  </div>
                )}
                {quest.type === 'referral' && quest?.percents && (
                  <div className="points">
                    <Text as="span" style={{ whiteSpace: 'nowrap' }}>
                      {quest.percents} %
                    </Text>
                  </div>
                )}
              </div>
            </div>
            <div className="questContent">
              <div className="questInfo">
                <div className="textContent">
                  <Text weight="1" className="questTitle">
                    {formatText(quest.title)}
                  </Text>
                  <Text className="questDescription">{formatText(quest.description ?? '')}</Text>
                  {quest.type === 'referral' && (
                    <p className="questDescription">
                      Your referrals:{' '}
                      {isArrayOfInvitees(quest.invitees || [])
                        ? (quest.invitees as string[])?.length || 0
                        : quest.invitees || 0}
                    </p>
                  )}
                  <div className="questFooter">
                    <Text className="timeRemaining">{remainingDays}d remaining</Text>
                    <div className="questActions">
                      {quest.completed && <Text style={{ color: '#0ee640' }}>Completed</Text>}

                      {!quest.completed &&
                        (quest.type !== 'social' ? (
                          <button
                            className="startButton"
                            disabled={isDisabled}
                            onClick={() => {
                              if (quest.type === 'video' || quest.type === 'referral') {
                                handleClick();
                              }
                            }}
                          >
                            {quest.type === 'video' && 'Watch & Earn →'}
                            {quest.type === 'dex' && 'Buy tokens →'}
                            {quest.type === 'referral' && 'Copy the invite'}
                            {quest.type === 'custom' && 'Start Quest →'}
                          </button>
                        ) : (
                          <RepostButton
                            card
                            quest={quest}
                            disabled={isDisabled}
                            accountId={accountId}
                            campaignId={campaignId}
                          >
                            <button className="startButton">Share now!</button>
                          </RepostButton>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {quest.type === 'social' && (
              <div className="instructions">
                <Text className="instructionsTitle">Instructions: </Text>
                <Text className="instructionsText">
                  {quest.instructions
                    ? formatText(quest.instructions)
                    : "Click the 'Repost' button to share this tweet on your Twitter account. Make sure to keep the @cereofficial mention and hashtags for your entry to be valid."}
                </Text>
                <RepostButton quest={quest} accountId={accountId} disabled={isDisabled} campaignId={campaignId}>
                  Repost
                </RepostButton>
              </div>
            )}
            {quest.type === 'dex' && (
              <div className="instructions">
                <button className="button" disabled={isDisabled}>
                  Buy tokens
                </button>
              </div>
            )}
            {quest.type === 'referral' && (
              <div className="instructions">
                <Text className="instructionsTitle">Instructions: </Text>
                <Text className="instructionsText">{formatText(quest.instructions)}</Text>
                <button className="button" onClick={handleOnReferralButtonClick} disabled={isDisabled}>
                  Refer-a-friend
                </button>
              </div>
            )}
            {quest.type === 'custom' && (
              <div className="instructions">
                <Text className="instructionsTitle">Instructions: </Text>
                {quest.instructions && <Text className="instructionsText">{formatText(quest.instructions)}</Text>}
                {quest.link && (
                  <button className="button" onClick={handleClick} disabled={isDisabled}>
                    Open Link
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);
