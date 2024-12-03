import { useMemo } from 'react';
import { useInitData } from '@telegram-apps/sdk-react';
import { BotApi } from '@tg-app/api';

import { DEFAULT_START_PARAM, TELEGRAM_BOT_URL } from '../constants';

export const useBot = () => {
  const { startParam = DEFAULT_START_PARAM } = useInitData() || {};

  return useMemo(() => new BotApi(TELEGRAM_BOT_URL, { startParam }), [startParam]);
};
