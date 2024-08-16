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
