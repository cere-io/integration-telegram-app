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
  description: string;
  price: number;
  token: string;
  payeeAddress: string;
};
