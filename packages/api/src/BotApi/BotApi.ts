import { Subscription, SubscriptionsResponse, TokenRequest, Video } from './types';

type RequestOprions = RequestInit & {
  allowStatus?: number[];
};

export type BotOptions = {
  startParam?: string;
};

export class BotApi {
  readonly baseUrl: URL;
  readonly startParam?: string;

  constructor(baseUrl: string, options: BotOptions = {}) {
    this.baseUrl = new URL('./', baseUrl);
    this.startParam = options.startParam;
  }

  private async request(url: string, { allowStatus = [], ...options }: RequestOprions = {}) {
    const response = await fetch(new URL(url, this.baseUrl), {
      ...options,
      headers: {
        ...options.headers,
          'X-Telegram-Chat': '-1002433493900',
      },
    });

    if (!response.ok && !allowStatus.includes(response.status)) {
      throw new Error(await response.text());
    }

    return response;
  }

  async getVideos(): Promise<Video[]> {
    const response = await this.request('videos');

    return response.json();
  }

  async saveVideo(video: Video): Promise<boolean> {
    const response = await this.request('videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(video),
    });

    return response.ok;
  }

  async deleteVideo(id: number | undefined): Promise<boolean> {
    const response = await this.request(`videos/${id}`, {
      method: 'DELETE',
    });

    return response.ok;
  }

  async getProofChallenge() {
    const response = await this.request('proofs');

    return response.text();
  }

  async getToken(request: TokenRequest) {
    const response = await this.request('proofs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    return response.text();
  }

  async getSubscriptions(): Promise<SubscriptionsResponse> {
    const response = await this.request('subscriptions');

    return response.json();
  }

  async getUserSubscription(address: string): Promise<Subscription | null> {
    const response = await this.request(`subscriptions/${address}`, { allowStatus: [404] });

    if (response.status === 404) {
      return null;
    }

    return response.json();
  }

  async saveSubscription(address: string) {
    const response = await this.request(`subscriptions/${address}`, {
      method: 'POST',
    });

    return response.ok;
  }

  async getWaletBalance(address: string) {
    const response = await this.request(`wallets/${address}/balance`);

    return BigInt(await response.text());
  }
}
