type TelegramUser = {
  username?: string;
  first_name: string;
  last_name?: string;
};

export const getDisplayName = (telegramUser?: TelegramUser, walletName?: string): string => {
  if (walletName) return walletName;

  if (!telegramUser) return 'Unknown';

  if (telegramUser.username) return telegramUser.username;

  const firstName = telegramUser.first_name;
  const lastInitial = telegramUser.last_name ? telegramUser.last_name[0] + '.' : '';

  return `${firstName} ${lastInitial}`.trim();
};
