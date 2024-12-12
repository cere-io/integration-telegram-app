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
};

export type BaseTask = {
  title: string;
  description: string;
  points: number;
  completed?: boolean;
};

export type VideoTask = BaseTask & {
  videoUrl: string;
  thumbnailUrl: string;
  type?: 'videoTask';
};

export type SocialTask = BaseTask & {
  platform: string;
  tweetLink: string;
  hashtags: string[];
  type: 'socialTask';
  requirements: {
    platform: string;
    action: string;
    tags: string[];
  };
};

export type DexTask = BaseTask & {
  platform: string;
  tradingLink: string;
  minimumAmount: number;
  type: 'dexTask';
  requirements: {
    platform: string;
    pair: string;
    minAmount: number;
  };
};

export type Quests = {
  videoTasks: VideoTask[];
  socialTasks: SocialTask[];
  dexTasks: DexTask[];
};
