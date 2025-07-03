interface WidgetTemplate {
  params: string;
}

interface EngagementPlacement {
  id: number;
}
export interface Engagement {
  id: number;
  campaign_id: number;
  engagement_name: string;
  engagement_placement?: Array<EngagementPlacement>;
  engagement_id: number;
  engagement_reward_item: Array<any>;
  engagement_social_task: Array<any>;
  widget_template: WidgetTemplate;
}
export interface EngagementEventData {
  engagement: Engagement;
  integrationScriptResults: unknown;
  userProfile: unknown;
}

export type Video = {
  id?: number;
  videoUrl: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  points: number;
  completed?: boolean;
  lastWatchedSegment?: number;
};

export type BaseTask = {
  title: string;
  description?: string;
  points?: number;
  completed?: boolean;
  originalIndex?: number;
  order?: number;
};

export type VideoTask = BaseTask & {
  videoUrl: string;
  thumbnailUrl: string;
  type: 'video';
};

export type SocialTask = BaseTask & {
  platform: string;
  tweetLink: string;
  hashtags: string[];
  type: 'social';
  requirements: {
    platform: string;
    action: string;
    tags: string[];
  };
  questImage?: string;
  instructions?: string;
  tweetText?: string;
};

export type DexTask = BaseTask & {
  platform: string;
  tradingLink: string;
  minimumAmount: number;
  type: 'dex';
  requirements: {
    platform: string;
    pair: string;
    minAmount: number;
  };
};

export type Question = {
  id: string;
  title: string;
  points: number;
  options: { id: string; text: string; isCorrect: boolean }[];
};

export type QuizTask = Pick<BaseTask, 'title' | 'completed' | 'originalIndex' | 'order'> & {
  type: 'quiz';
  id: string;
  questions: Question[];
  lastAnsweredQuestion: number | null;
};

export type ReferralTask = BaseTask & {
  percents: number;
  type: 'referral';
  invitees?: string[] | number;
  instructions: string;
  questImage?: string;
  message?: string;
};

export type BaseCustomTask = {
  id: string;
  type: 'custom';
  startEvent: string;
  completedEvent: string;
  questImage?: string;
  link?: string;
  instructions?: string;
  is_mandatory?: boolean;
  points?: number;
  order?: number;
  completed?: boolean;
};

export type DefaultCustomTask = BaseCustomTask & {
  subtype?: 'default'; // default по умолчанию
  description?: string;
};

export type WalletCustomTask = BaseCustomTask & {
  subtype: 'wallet';
  walletType: 'EVM-compatible' | 'Substrate' | 'Solana' | 'Near' | 'Bitcoin' | 'Other';
  walletNetwork: string;
  walletAddress?: string;
};

export type CustomTask = DefaultCustomTask | WalletCustomTask;

export type Task = VideoTask | SocialTask | DexTask | QuizTask | ReferralTask | CustomTask;

export type Quests = {
  videoTasks: VideoTask[];
  socialTasks: SocialTask[];
  dexTasks: DexTask[];
  quizTasks: QuizTask[];
  referralTask?: ReferralTask;
  customTasks: CustomTask[];
};

export type LeaderboardUser = {
  user: string;
  points: number;
  rank: number;
  username?: string;
  external_wallet_address?: string;
  quests?: Quests;
};
