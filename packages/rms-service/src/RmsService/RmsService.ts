import { Campaign, Response } from './types.ts';

type RequestOptions = RequestInit & {
  allowStatus?: number[];
};

export class RmsService {
  readonly baseUrl: URL;

  constructor(baseUrl: string) {
    this.baseUrl = new URL(baseUrl);
  }

  private async request(url: string, { allowStatus = [], ...options }: RequestOptions = {}) {
    const response = await fetch(new URL(url, this.baseUrl), {
      ...options,
    });

    if (!response.ok && !allowStatus.includes(response.status)) {
      throw new Error(await response.text());
    }
    return response;
  }

  async getCampaignById(campaignId: string): Promise<Campaign | undefined> {
    const response = await this.request(`/api/campaign/${campaignId}`);

    const responseBody: Response<Campaign> = await response.json();

    return responseBody.data;
  }
}
