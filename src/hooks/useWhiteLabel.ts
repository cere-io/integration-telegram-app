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
      description: 'Unlock exclusive fitness content to reach your goals 💪',
      benefits: ['🏋️‍♂️ Personalized Workouts', '🎓 Expert Guidance', '📈 Progress Tracking'],
    },
  };
};
