import { Campaign, Response } from './types.ts';

type RequestOptions = RequestInit & {
  allowStatus?: number[];
};

export class RmsService {
  readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  buildUrl(path: string) {
    const normalizedPath = path.replace(/^\/+/, '');
    return `${this.baseUrl}/${normalizedPath}`;
  }

  private async request(path: string, { allowStatus = [], ...options }: RequestOptions = {}) {
    const url = this.buildUrl(path);

    const response = await fetch(url, {
      ...options,
    });

    if (!response.ok && !allowStatus.includes(response.status)) {
      throw new Error(await response.text());
    }
    return response;
  }

  async getCampaignById(campaignId: string): Promise<Campaign | undefined> {
    const response = await this.request(`/campaign/${campaignId}`);

    const responseBody: Response<Campaign> = await response.json();

    return responseBody.data;
  }

  async getCampaignByOrganizationId(organizationId: string): Promise<Campaign | undefined> {
    const response = await this.request(`/campaign/organization/${organizationId}`);

    const responseBody: Response<Campaign> = await response.json();

    return responseBody.data;
  }

  async getOrganizationAssociatedWithCampaign(campaignId: string): Promise<any> {
    const response = await this.request(`/campaign/${campaignId}/organization`);

    return await response.json();
  }
}
