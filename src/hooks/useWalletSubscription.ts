import { useCallback, useEffect, useState } from 'react';
import { Subscription } from '@tg-app/api';

import { useBot } from './useBot';

export const useWalletSubscriptions = (address?: string) => {
  const bot = useBot();
  const [data, setData] = useState<Subscription>();

  const sync = useCallback(async () => {
    if (!address) {
      return;
    }

    await bot.saveSubscription(address);
    await bot.getUserSubscription(address).then(setData);
  }, [bot, address]);

  useEffect(() => {
    if (!address) {
      setData(undefined);

      return;
    }

    bot.getUserSubscription(address).then(setData);
  }, [bot, address]);

  return {
    data,
    sync,
    loading: data === undefined,
  };
};
