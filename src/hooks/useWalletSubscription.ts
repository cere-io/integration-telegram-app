import { useEffect, useState } from 'react';
import { Subscription } from '@tg-app/api';

import { useBot } from './useBot';

export const useWalletSubscriptions = (address?: string) => {
  const bot = useBot();
  const [data, setData] = useState<Subscription>();

  useEffect(() => {
    if (!address) {
      setData(undefined);

      return;
    }

    bot.getUserSubscription(address).then(setData);
  }, [bot, address]);

  return {
    data,
    loading: data === undefined,
  };
};
