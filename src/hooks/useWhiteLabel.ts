export type WhiteLabel = {
  subscription: {
    imageUrl: string;
    description: string;
    benefits: string[];
  };

  termsOfUseUrl: string;
  privacyPolicyUrl: string;
};

export const useWhiteLabel = (): WhiteLabel => {
  const appUrl = window.location.origin;

  /**
   * TODO: Get the following values from the BOT
   */
  return {
    privacyPolicyUrl: `${appUrl}/privacy-policy.html`,
    termsOfUseUrl: `${appUrl}/terms-of-use.html`,
    subscription: {
      imageUrl: `${appUrl}/images/subscription.png`,
      description: 'Subscribe for exclusive content from your favorite Telegram Creator!',
      benefits: [
        '⭐ Creators receive 100% of profits',
        '🧑‍✈️ Fully censorship-resistant streaming',
        '📺 Use AirPlay to stream directly to your TV',
      ],
    },
  };
};
