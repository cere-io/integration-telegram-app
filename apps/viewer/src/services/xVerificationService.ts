export interface XVerificationService {
  generateWalletToken(): Promise<string | null>;
  verifyFollow(username: string, token: string): Promise<boolean>;
  verifyLike(tweetId: string, token: string): Promise<boolean>;
  verifyTweetAndShare(keywords: string[], requiredUrls: string[], token: string): Promise<boolean>;
  extractTweetId(tweetId: string): string;
}

export class XVerificationServiceImpl implements XVerificationService {
  private cereWallet: any;
  private isDev = import.meta.env.DEV;

  constructor(cereWallet: any) {
    this.cereWallet = cereWallet;
  }

  private getTwitterApiUrl(path: string): string {
    if (this.isDev) {
      return `/auth/x/proxy/twitter${path}`;
    } else {
      return `https://api.twitter.com${path}`;
    }
  }

  async generateWalletToken(): Promise<string | null> {
    if (!this.cereWallet) return null;

    try {
      const signer = this.cereWallet.getSigner({ type: 'ed25519' });
      const account = await signer.getAccount();
      const publicKey = account.publicKey;
      if (!publicKey) {
        throw new Error('Failed to get public key from wallet');
      }

      console.log('Generating JWT token for public key:', publicKey);

      // Create JWT header
      const header = {
        alg: 'ed25519',
        typ: 'JWT',
      };

      // Create JWT payload
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        publicKey: `0x${publicKey}`,
        iat: now,
        exp: now + 600, // 10 minutes expiration
      };

      console.log('JWT header:', header);
      console.log('JWT payload:', payload);

      // Base64URL encode header and payload
      const headerEncoded = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const payloadEncoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      console.log('Encoded header:', headerEncoded);
      console.log('Encoded payload:', payloadEncoded);

      // Sign header.payload with wallet's private key
      const message = `${headerEncoded}.${payloadEncoded}`;
      console.log('Message to sign:', message);

      const signatureText = await signer.signMessage(message);
      console.log('Signature (raw):', signatureText);

      // Base64URL encode signature
      const signatureEncoded = btoa(signatureText).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      console.log('Encoded signature:', signatureEncoded);

      const jwtToken = `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`;
      console.log('Final JWT token:', jwtToken.substring(0, 50) + '...');

      return jwtToken;
    } catch (error) {
      console.error('Failed to generate wallet token:', error);
      return null;
    }
  }

  private async getXTokens(walletToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      console.log('Requesting X tokens from walletApi...');
      console.log('Using wallet token:', walletToken.substring(0, 50) + '...');

      const response = await fetch(`/auth/x/data?token=${encodeURIComponent(walletToken)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('WalletApi response status:', response.status);
      console.log('WalletApi response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Access token expired, trying to refresh via cere-wallet-api...');
          const refreshedTokens = await this.refreshTokens();
          if (refreshedTokens) {
            return refreshedTokens;
          }
        }
        const errorText = await response.text();
        console.error('Failed to get X tokens from walletApi:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      console.log('X tokens response data:', data);

      return {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      };
    } catch (error) {
      console.error('Error getting X tokens:', error);
      return null;
    }
  }

  async verifyFollow(username: string, token: string): Promise<boolean> {
    try {
      console.log('Verifying follow for username:', username);

      const xTokens = await this.getXTokens(token);
      if (!xTokens) {
        console.error('Failed to get X tokens');
        return false;
      }

      const response = await fetch(this.getTwitterApiUrl('/2/users/me'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${xTokens.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Access token expired, trying to refresh...');
          const refreshedTokens = await this.refreshTokens();
          if (refreshedTokens) {
            const retryResponse = await fetch(this.getTwitterApiUrl('/2/users/me'), {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${refreshedTokens.accessToken}`,
                'Content-Type': 'application/json',
              },
            });
            if (!retryResponse.ok) {
              const errorText = await retryResponse.text();
              console.error('Failed to get current user info after refresh:', errorText);
              return false;
            }
            const meData = await retryResponse.json();
            return await this.checkFollowing(meData.data.id, username, refreshedTokens.accessToken);
          }
        }
        const errorText = await response.text();
        console.error('Failed to get current user info:', errorText);
        return false;
      }

      const meData = await response.json();
      console.log('User data:', meData);

      return await this.checkFollowing(meData.data.id, username, xTokens.accessToken);
    } catch (error) {
      console.error('Error verifying follow:', error);
      return false;
    }
  }

  private async checkFollowing(userId: string, username: string, accessToken: string): Promise<boolean> {
    const followingResponse = await fetch(this.getTwitterApiUrl(`/2/users/${userId}/following?max_results=1000`), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!followingResponse.ok) {
      const errorText = await followingResponse.text();
      console.error('Failed to get following list:', errorText);
      return false;
    }

    const followingData = await followingResponse.json();
    console.log('Following data:', followingData);

    // Check if the target user is in the subscription list
    return followingData.data.some((user: any) => user.username === username);
  }

  private async refreshTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      console.log('Refreshing X tokens via cere-wallet-api...');

      // Generate wallet token for authentication
      const walletToken = await this.generateWalletToken();
      if (!walletToken) {
        console.error('Failed to generate wallet token for refresh');
        return null;
      }

      const response = await fetch('/auth/x/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: walletToken,
        }),
      });

      if (!response.ok) {
        console.error('Failed to refresh tokens via cere-wallet-api:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('Refreshed tokens via cere-wallet-api:', data);

      return {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      };
    } catch (error) {
      console.error('Error refreshing tokens via cere-wallet-api:', error);
      return null;
    }
  }

  async verifyLike(tweetId: string, token: string): Promise<boolean> {
    try {
      const xTokens = await this.getXTokens(token);
      if (!xTokens) {
        console.error('Failed to get X tokens from Wallet Api');
        return false;
      }
      const extractedTweetId = this.extractTweetId(tweetId);

      const meResponse = await fetch(this.getTwitterApiUrl('/2/users/me'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${xTokens.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!meResponse.ok) {
        if (meResponse.status === 401) {
          console.log('Access token expired, trying to refresh...');
          const refreshedTokens = await this.refreshTokens();
          if (refreshedTokens) {
            return await this.checkLikedTweet(extractedTweetId, refreshedTokens.accessToken);
          }
        }
        const errorText = await meResponse.text();
        console.error('Failed to get current user info:', errorText);
        return false;
      }

      const meData = await meResponse.json();
      const currentUserId = meData.data.id;

      return await this.checkLikedTweet(extractedTweetId, xTokens.accessToken, currentUserId);
    } catch (error) {
      console.error('Error verifying like:', error);
      return false;
    }
  }

  private async checkLikedTweet(tweetId: string, accessToken: string, userId?: string): Promise<boolean> {
    let currentUserId = userId;

    if (!currentUserId) {
      const meResponse = await fetch(this.getTwitterApiUrl('/2/users/me'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!meResponse.ok) {
        const errorText = await meResponse.text();
        console.error('Failed to get current user info:', errorText);
        return false;
      }

      const meData = await meResponse.json();
      currentUserId = meData.data.id;
    }

    const likedResponse = await fetch(this.getTwitterApiUrl(`/2/users/${currentUserId}/liked_tweets?max_results=100`), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!likedResponse.ok) {
      const errorText = await likedResponse.text();
      console.error('Failed to get liked tweets:', errorText);
      return false;
    }

    const likedData = await likedResponse.json();

    return (likedData.data ?? []).some((tweet: any) => tweet.id === tweetId);
  }

  async verifyTweetAndShare(keywords: string[], requiredUrls: string[], token: string): Promise<boolean> {
    try {
      console.log('Verifying tweet and share with keywords:', keywords, 'and URLs:', requiredUrls);

      // Receive X tokens from walletApi
      const xTokens = await this.getXTokens(token);
      if (!xTokens) {
        console.error('Failed to get X tokens');
        return false;
      }

      const meResponse = await fetch(this.getTwitterApiUrl('/2/users/me'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${xTokens.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!meResponse.ok) {
        if (meResponse.status === 401) {
          console.log('Access token expired, trying to refresh...');
          const refreshedTokens = await this.refreshTokens();
          if (refreshedTokens) {
            return await this.checkUserTweets(keywords, requiredUrls, refreshedTokens.accessToken);
          }
        }
        const errorText = await meResponse.text();
        console.error('Failed to get current user info:', errorText);
        return false;
      }

      const meData = await meResponse.json();
      const currentUserId = meData.data.id;

      return await this.checkUserTweets(keywords, requiredUrls, xTokens.accessToken, currentUserId);
    } catch (error) {
      console.error('Error verifying tweet and share:', error);
      return false;
    }
  }

  private async checkUserTweets(
    keywords: string[],
    requiredUrls: string[],
    accessToken: string,
    userId?: string,
  ): Promise<boolean> {
    let currentUserId = userId;

    if (!currentUserId) {
      const meResponse = await fetch(this.getTwitterApiUrl('/2/users/me'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!meResponse.ok) {
        const errorText = await meResponse.text();
        console.error('Failed to get current user info:', errorText);
        return false;
      }

      const meData = await meResponse.json();
      currentUserId = meData.data.id;
    }

    // Getting user tweets
    const tweetsResponse = await fetch(
      this.getTwitterApiUrl(`/2/users/${currentUserId}/tweets?max_results=50&tweet.fields=text,created_at`),
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!tweetsResponse.ok) {
      const errorText = await tweetsResponse.text();
      console.error('Failed to get user tweets:', errorText);
      return false;
    }

    const tweetsData = await tweetsResponse.json();
    const tweets = tweetsData.data || [];

    // Check if there is a tweet with the required content
    return tweets.some((tweet: any) => {
      const tweetText = (tweet.text || '').toLowerCase();

      // Checking keywords
      const hasKeyword = keywords.length === 0 || keywords.some((keyword) => tweetText.includes(keyword.toLowerCase()));

      // Checking URL
      const hasUrl = requiredUrls.length === 0 || requiredUrls.some((url) => tweetText.includes(url.toLowerCase()));

      // For tweet_and_share, at least one keyword OR one URL is required
      return hasKeyword || hasUrl;
    });
  }

  public extractTweetId(tweetIdOrUrl: string): string {
    if (/^\d+$/.test(tweetIdOrUrl)) {
      return tweetIdOrUrl;
    }

    // https://twitter.com/username/status/1234567890123456789
    // https://x.com/username/status/1234567890123456789
    const match = tweetIdOrUrl.match(/\/status\/(\d+)/);
    if (match) {
      return match[1];
    }

    return tweetIdOrUrl;
  }
}

// Helper function to create service instance
export const createXVerificationService = (cereWallet: any): XVerificationService => {
  return new XVerificationServiceImpl(cereWallet);
};
