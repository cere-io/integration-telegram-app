import { Response, Edek } from './types';

type RequestOptions = RequestInit & {
  allowStatus?: number[];
};

export class AgentServiceRegistry {
  readonly baseUrl: URL;
  readonly startParam?: string;

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

  async saveEdek(edek: Edek, authorization: string): Promise<Edek> {
    const response = await this.request('/access-registry/edek', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify(edek),
    });

    const responseBody: Response<Edek> = await response.json();
    return responseBody.data;
  }

  async getEdek(userPubKey: string, dataServicePubKey: string, authorization: string): Promise<Edek> {
    const response = await this.request(
      `/access-registry/edek?userPubKey=${userPubKey}&dataServicePubKey=${dataServicePubKey}`,
      {
        headers: {
          Authorization: authorization,
        },
      },
    );
    const responseBody: Response<Edek> = await response.json();
    return responseBody.data;
  }
}
