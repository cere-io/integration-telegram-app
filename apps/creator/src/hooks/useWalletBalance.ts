import { useCallback, useEffect, useState } from 'react';
import { fromNano } from '@ton/core/dist/utils/convert';

import { useBot } from './useBot';

export const useWalletBalance = (address?: string) => {
  const bot = useBot();
  const [balance, setBalance] = useState<bigint>();
  const finalBalance = address && balance ? fromNano(balance) : undefined;

  const sync = useCallback(async () => {
    if (!address) {
      return;
    }

    setBalance(await bot.getWaletBalance(address));
  }, [bot, address]);

  useEffect(() => {
    sync();
    const interval = setInterval(sync, 6000);

    return () => clearInterval(interval);
  }, [bot, address, sync]);

  return {
    balance: finalBalance,
    value: balance,
    sync,
    loading: finalBalance === undefined,
  };
};
