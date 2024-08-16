import { Subscription, SubscriptionsResponse, Video } from './types';

export class BotApi {
  readonly baseUrl: URL;

  constructor(baseUrl: string) {
    this.baseUrl = new URL('./', baseUrl);
  }

  async getVideos(): Promise<Video[]> {
    const response = await fetch(new URL('videos', this.baseUrl));

    return response.json();
  }

  async getToken() {
    const response = await fetch(new URL('token', this.baseUrl));

    return response.text();
  }

  async getSubscriptions(): Promise<SubscriptionsResponse> {
    const response = await fetch(new URL('subscriptions', this.baseUrl));

    return response.json();
  }

  async getUserSubscription(address: string): Promise<Subscription | undefined> {
    const response = await fetch(new URL(`subscriptions/${address}`, this.baseUrl));

    return response.json();
  }
}
