import { useMemo } from 'react';
import { useInitData } from '@telegram-apps/sdk-react';
import { BotApi } from '@tg-app/api';

import { TELEGRAM_BOT_URL } from '~/constants';

export const useBot = () => {
  const { startParam } = useInitData() || {};

  const botApi = useMemo(() => new BotApi(TELEGRAM_BOT_URL, { startParam }), [startParam]);

  return botApi;
};
