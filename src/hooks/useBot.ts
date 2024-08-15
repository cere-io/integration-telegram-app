import { useMemo } from 'react';
import { BotApi } from '@tg-app/api';

import { TELEGRAM_BOT_URL } from '~/constants';

export const useBot = () => {
  const botApi = useMemo(() => new BotApi(TELEGRAM_BOT_URL), []);

  return botApi;
};
