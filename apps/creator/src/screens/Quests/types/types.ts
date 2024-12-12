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
