import {
  Campaign,
  Quest,
  SafeLinkConfig,
  Subscription,
  SubscriptionsResponse,
  TelegramUser,
  TokenRequest,
  Video,
} from './types';

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
        ...(this.startParam && {
          'X-Telegram-Chat': this.startParam,
        }),
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

  async saveVideo(video: Video): Promise<Video> {
    const response = await this.request('videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(video),
    });

    return response.json();
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

  async getQuests(): Promise<Quest[]> {
    const response = await this.request('quests');

    return response.json();
  }

  async saveQuest(quest: Quest): Promise<Quest> {
    const response = await this.request('quests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quest),
    });

    return response.json();
  }

  async deleteQuest(id: number | undefined): Promise<boolean> {
    const response = await this.request(`quests/${id}`, {
      method: 'DELETE',
    });

    return response.ok;
  }

  async getCampaigns(): Promise<Campaign[]> {
    const response = await this.request('campaigns');

    return response.json();
  }

  async saveCampaign(campaign: Campaign): Promise<Campaign> {
    const response = await this.request('campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(campaign),
    });

    return response.json();
  }

  async deleteCampaign(id: number | undefined): Promise<boolean> {
    const response = await this.request(`campaigns/${id}`, {
      method: 'DELETE',
    });

    return response.ok;
  }

  // F1 - Safe Link and Telegram User Management
  async registerTelegramUser(user: TelegramUser, campaignSlug: string): Promise<boolean> {
    const response = await this.request('telegram/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user,
        campaign_slug: campaignSlug,
      }),
    });

    return response.ok;
  }

  async getSafeLinkConfig(campaignSlug: string): Promise<SafeLinkConfig> {
    const response = await this.request(`telegram/safe-links/${campaignSlug}`);
    return response.json();
  }

  async sendWelcomeMessage(userId: number, campaignSlug: string): Promise<boolean> {
    const response = await this.request('telegram/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        campaign_slug: campaignSlug,
      }),
    });

    return response.ok;
  }

  // F2 - Wallet Quest Management
  async submitWalletAddress(
    address: string,
    chainType: 'evm' | 'solana' | 'cere_svm',
    campaignId: string,
  ): Promise<boolean> {
    const response = await this.request('quests/wallet/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        chain_type: chainType,
        campaign_id: campaignId,
      }),
    });

    return response.ok;
  }

  async validateWalletAddress(address: string, chainType: 'evm' | 'solana' | 'cere_svm'): Promise<boolean> {
    const response = await this.request('quests/wallet/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        chain_type: chainType,
      }),
    });

    const result = await response.json();
    return result.valid;
  }

  // F3 - Telegram Join Quest Management
  async checkTelegramMembership(userId: number, chatId: string): Promise<boolean> {
    const response = await this.request('telegram/check-membership', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        chat_id: chatId,
      }),
    });

    const result = await response.json();
    return result.is_member;
  }

  async submitTelegramJoinQuest(questId: string, campaignId: string): Promise<boolean> {
    const response = await this.request('quests/telegram-join/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quest_id: questId,
        campaign_id: campaignId,
      }),
    });

    return response.ok;
  }

  // F4 - X Connect Quest Management
  async initiateXOAuth(campaignId: string, questId: string): Promise<{ oauth_url: string; state: string }> {
    const response = await this.request('quests/x-connect/oauth/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: campaignId,
        quest_id: questId,
      }),
    });

    return response.json();
  }

  async handleXOAuthCallback(code: string, state: string): Promise<boolean> {
    const response = await this.request('quests/x-connect/oauth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        state,
      }),
    });

    return response.ok;
  }

  async getXConnectionStatus(campaignId: string): Promise<{ connected: boolean; username?: string }> {
    const response = await this.request(`quests/x-connect/status/${campaignId}`);
    return response.json();
  }

  // F5 - Campaign Status Management
  async getCampaignStatus(campaignId: string): Promise<{ status: 'active' | 'completed'; end_date?: string }> {
    const response = await this.request(`campaigns/${campaignId}/status`);
    return response.json();
  }

  async getCampaignResults(campaignId: string): Promise<{
    user_rank?: number;
    user_points?: number;
    total_participants: number;
    leaderboard: Array<{ rank: number; username: string; points: number }>;
    completion_message?: string;
  }> {
    const response = await this.request(`campaigns/${campaignId}/results`);
    return response.json();
  }
}
