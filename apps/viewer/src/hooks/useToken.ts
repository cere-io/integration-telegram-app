import { useCallback, useEffect, useState } from 'react';

import { useBot } from './useBot';
import { useWallet } from './useWallet';

export const useToken = () => {
  const { account, tonProof, loading } = useWallet();
  const bot = useBot();
  const [token, setToken] = useState<string | null>();

  const refetch = useCallback(async () => {
    if (!tonProof || !account?.publicKey) {
      setToken(null);

      return null;
    }

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
    if (!loading) {
      refetch();
    }
  }, [refetch, loading]);

  return {
    refetch,
    token: token || undefined,
    loading: loading || token === undefined,
  };
};
