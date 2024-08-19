import { useCallback, useEffect, useState } from 'react';

import { useBot } from './useBot';
import { useWallet } from './useWallet';

export const useToken = () => {
  const { account, tonProof } = useWallet();
  const bot = useBot();
  const [token, setToken] = useState<string | null>();

  const refetch = useCallback(async () => {
    if (!account || !tonProof || !account.publicKey) {
      setToken(null);

      return;
    }

    setToken(undefined);

    const token = await bot.getToken({
      address: account.address,
      network: +account.chain,
      public_key: account.publicKey,
      proof: {
        state_init: account.walletStateInit,
        ...tonProof.proof,
      },
    });

    setToken(token || null);

    return token;
  }, [account, bot, tonProof]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    refetch,
    token: token || undefined,
    loading: token === undefined,
  };
};
