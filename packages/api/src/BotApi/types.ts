export type Video = {
  id?: number;
  url: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  watched?: boolean;
};

export type Subscription = {
  id: number;
  durationInDays: number;
  description: string;
  price: number;
};

export type SubscriptionsResponse = {
  destinationWallet: string;
  subscriptions: Subscription[];
};

export type Proof = {
  timestamp: number;
  domain: {
    lengthBytes: number;
    value: string;
  };
  payload: string;
  signature: string;
  state_init: string;
};

export type TokenRequest = {
  address: string;
  network: number;
  public_key: string;
  proof: Proof;
};

export type Quest = {
  id?: number;
  title?: string;
  description?: string;
  type?: string;
  videoId?: string;
  url?: string;
  rewardPoints?: number;
};

export type Campaign = {
  id?: number;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  quests: Quest[];
};

export type TelegramUser = {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  premium?: boolean;
  added_to_attachment_menu?: boolean;
};

export type CampaignUserMapping = {
  user_id: number;
  campaign_slug: string;
  first_interaction: Date;
  last_interaction?: Date;
};

export type SafeLinkConfig = {
  campaign_slug: string;
  campaign_id: string;
  welcome_message: string;
  welcome_image?: string;
  cta_text: string;
  brand_customization?: {
    colors?: {
      primary?: string;
      secondary?: string;
    };
    logo?: string;
  };
};

export type WalletQuestData = {
  type: 'wallet';
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  is_mandatory: boolean;
  supported_chains: ('evm' | 'solana' | 'cere_svm')[];
};

export type TelegramJoinQuestData = {
  type: 'telegram_join';
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  target_chat_id: string;
  target_chat_name: string;
  invite_link?: string;
  join_timestamp?: Date;
};

export type XConnectQuestData = {
  type: 'x_connect';
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  is_mandatory: boolean;
  required_scope: string[];
  privacy_notice: string;
};
