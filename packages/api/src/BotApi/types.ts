export type Video = {
  url: string;
  name: string;
  description: string;
  width: number;
  height: number;
  duration: number;
  fileSize: number;
  thumbnailUrl: string | null;
  mimeType: string;
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
