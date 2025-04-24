export type Campaign = {
  campaignId: number;
  status: number;
  startDate: string;
  campaignRules: string;
  endDate: string;
  campaignName: string;
  type: string | null;
  likeId: string;
  archive: number;
  mobile: number;
  userName: string;
  modDate: string;
  guid: string;
  formData: FormDataType;
  templateHtml?: string;
};

export type Template = {
  id: string;
  name: string;
  type: string;
  theme: string;
  params: string;
  archived: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  guid: string;
};

type VideoTask = {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  points: number;
  sequence: number;
};

type SocialTaskRequirements = {
  platform: string;
  action: string;
  tags: string[];
  prerequisiteVideos: number;
};

type SocialTask = {
  title: string;
  description: string;
  platform: string;
  tweetLink: string;
  hashtags: string[];
  points: number;
  type: 'social';
  requirements: SocialTaskRequirements;
};

type ReferralTask = {
  title: string;
  description: string;
  instructions: string;
  message: string;
  points?: number;
  percents?: number;
  questImage?: string;
};

type Quests = {
  videoTasks: VideoTask[];
  socialTasks: SocialTask[];
  referralTask: ReferralTask;
};

type Metadata = {
  version: string;
  exportTimestamp: string;
  format: string;
};

export type FormDataType = {
  campaign: {
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    description: string;
    debug: boolean;
    configuration: {
      welcomeScreen: {
        title?: string;
        description?: string;
        buttonText?: string;
        agreementText?: string;
        privacyText?: string;
        privacyLink?: string;
        sliderContent?: Array<{
          icon?: string;
          title?: string;
          description?: string;
        }>;
        cssVariables?: {
          '--color-primary'?: string;
          '--color-secondary'?: string;
          '--color-background'?: string;
          '--color-text'?: string;
          '--color-text-muted'?: string;
          '--border-radius'?: string;
          '--border-radius-card'?: string;
          '--shadow-intense'?: string;
          '--shadow-border'?: string;
        };
      };
    };
  };
  quests: Quests;
  leaderboard: any[];
  metadata: Metadata;
};

export type Response<D> = {
  code: string;
  message: string;
  details: string;
  data?: D;
};
