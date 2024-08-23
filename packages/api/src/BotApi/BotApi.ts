import { Subscription, SubscriptionsResponse, TokenRequest, Video } from './types';

type RequestOprions = RequestInit & {
  allowStatus?: number[];
};

export class BotApi {
  readonly baseUrl: URL;

  constructor(baseUrl: string) {
    this.baseUrl = new URL('./', baseUrl);
  }

  private async request(url: string, { allowStatus = [], ...options }: RequestOprions = {}) {
    const response = await fetch(new URL(url, this.baseUrl), options);

    if (!response.ok && !allowStatus.includes(response.status)) {
      throw new Error(await response.text());
    }

    return response;
  }

  async getVideos(): Promise<Video[]> {
    const response = await this.request('videos');

    return response.json();
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

  async getUserSubscription(address: string): Promise<Subscription | undefined> {
    const response = await this.request(`subscriptions/${address}`, { allowStatus: [404] });

    if (response.status === 404) {
      return undefined;
    }

    return response.json();
  }

  async saveSubscription(address: string) {
    const response = await this.request(`subscriptions/${address}`, {
      method: 'POST',
    });

    return response.ok;
  }
}
