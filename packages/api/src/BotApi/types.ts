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
  rewardPoints?: number;
};

export type Campaign = {
  id?: number;
  title: string;
  description: string;
  quests: Quest[];
};
