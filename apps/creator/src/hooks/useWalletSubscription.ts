import { useCallback, useEffect, useState } from 'react';
import { Subscription } from '../../../../packages/api';
import Reporting from '../../../../packages/reporting';

import { useBot } from './useBot';

export const useWalletSubscriptions = (address?: string) => {
  const bot = useBot();
  const [data, setData] = useState<Subscription | null>();
  const [loading, setLoading] = useState(false);

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

  const load = useCallback(
    async (customAddress?: string) => {
      const finalAddress = customAddress || address;

      if (!finalAddress) {
        return setData(undefined);
      }

      setLoading(true);

      const subscription = await bot.getUserSubscription(finalAddress);
      setData(subscription);
      setLoading(false);

      return subscription;
    },
    [bot, address],
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    sync,
    load,
    loading,
  };
};
