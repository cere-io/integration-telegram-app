import { useCallback, useEffect, useState } from 'react';
import { Subscription } from '@tg-app/api';
import Reporting from '@tg-app/reporting';

import { useBot } from './useBot';

export const useWalletSubscriptions = (address?: string) => {
  const bot = useBot();
  const [data, setData] = useState<Subscription>();

  const sync = useCallback(async () => {
    if (!address) {
      return;
    }

    const isOk = await bot.saveSubscription(address);

    if (isOk) {
      await bot.getUserSubscription(address).then(setData);
    } else {
      Reporting.message('Save subscription returned not OK result', { walletAddress: address }, 'warning');
    }
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
