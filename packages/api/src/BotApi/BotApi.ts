import { Subscription, SubscriptionsResponse, TokenRequest, Video } from './types';

export class BotApi {
  readonly baseUrl: URL;

  constructor(baseUrl: string) {
    this.baseUrl = new URL('./', baseUrl);
  }

  async getVideos(): Promise<Video[]> {
    const response = await fetch(new URL('videos', this.baseUrl));

    return response.json();
  }

  async getProofChallenge() {
    const response = await fetch(new URL(`proofs`, this.baseUrl));

    return response.text();
  }

  async getToken(request: TokenRequest) {
    const response = await fetch(new URL(`proofs`, this.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    return response.text();
  }

  async getSubscriptions(): Promise<SubscriptionsResponse> {
    const response = await fetch(new URL('subscriptions', this.baseUrl));

    return response.json();
  }

  async getUserSubscription(address: string): Promise<Subscription | undefined> {
    const response = await fetch(new URL(`subscriptions/${address}`, this.baseUrl));

    if (response.status === 404) {
      return undefined;
    }

    return response.json();
  }

  async saveSubscription(address: string) {
    const response = await fetch(new URL(`subscriptions/${address}`, this.baseUrl), {
      method: 'POST',
    });

    return response.ok;
  }
}
