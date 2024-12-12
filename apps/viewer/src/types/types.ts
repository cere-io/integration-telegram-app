interface SocialTask {
  id: number;
  params: Array<{ [key: string]: any }>;
}

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
  engagement_social_task: Array<SocialTask>;
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
