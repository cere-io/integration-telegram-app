import { SocialTask } from '@integration-telegram-app/viewer/src/types';
import { Text } from '@telegram-apps/telegram-ui';
import Markdown from 'markdown-to-jsx';
import React from 'react';

import { RepostButton } from './RepostButton';

// Helper function for default instructions
const getDefaultInstructions = (action: string): string => {
  switch (action) {
    case 'retweet':
      return "Click the 'Repost' button to share this tweet on your Twitter account. Make sure to keep the @cereofficial mention and hashtags for your entry to be valid.";
    case 'follow':
      return "Click the 'Follow' button to follow the specified account on X (Twitter). Your follow will be automatically verified.";
    case 'like':
      return "Click the 'Like' button to like the specified tweet on X (Twitter). Your like will be automatically verified.";
    case 'tweet_and_share':
      return "Click the 'Tweet' button to create a tweet with the required keywords or URLs. Your tweet will be automatically verified.";
    default:
      return 'Complete the required social media action to earn points.';
  }
};

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

type SocialQuestProps = {
  quest: SocialTask;
  remainingDays: number;
  accountId: string | null;
  campaignId?: number;
  organizationId?: number;
  isDisabled?: boolean;
};

export const SocialQuest = ({
  quest,
  accountId,
  organizationId,
  campaignId,
  remainingDays,
  isDisabled,
}: SocialQuestProps) => {
  return (
    <div className="questCard">
      {quest?.completed && <div className="overlay" />}
      <div className="questThumbnailBlock" style={{ cursor: 'pointer' }}>
        {quest?.questImage ? (
          <img className="questThumbnail" src={quest.questImage} alt={quest.title} />
        ) : (
          <TwitterIcon />
        )}

        <div className="pointsBlock">
          {quest?.points && quest.points > 0 && (
            <div className="points">
              <Text as="span" style={{ whiteSpace: 'nowrap' }}>
                {quest.points} Pts
              </Text>
            </div>
          )}
        </div>
      </div>
      <div className="questContent">
        <div className="questInfo">
          <div className="textContent">
            <Text weight="1" className="questTitle">
              {formatText(quest.title as string)}
            </Text>
            <Text className="questDescription">{formatText(quest.description ?? '')}</Text>
          </div>
        </div>
        <div className="questFooter">
          <Text className="timeRemaining">{remainingDays}d remaining</Text>
          <div className="questActions">
            {quest.completed && <Text style={{ color: '#0ee640' }}>Completed</Text>}

            {!quest.completed && (
              <RepostButton
                card
                quest={quest}
                disabled={isDisabled}
                organizationId={organizationId}
                accountId={accountId || undefined}
                campaignId={campaignId}
              >
                <button className="startButton">Share now!</button>
              </RepostButton>
            )}
          </div>
        </div>
      </div>

      <div className="instructions">
        <Text className="instructionsTitle">Instructions: </Text>
        <Text className="instructionsText">
          {quest.instructions ? formatText(quest.instructions) : getDefaultInstructions(quest.requirements.action)}
        </Text>
        <RepostButton quest={quest} accountId={accountId || undefined} disabled={isDisabled} campaignId={campaignId} />
      </div>
    </div>
  );
};
