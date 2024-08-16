import { useCallback, useEffect, useState } from 'react';

import { useBot } from './useBot';
import { useWallet } from './useWallet';

export const useToken = () => {
  const { account, tonProof } = useWallet();
  const bot = useBot();
  const [token, setToken] = useState<string>();

  const refetch = useCallback(async () => {
    console.log('refetch', { account, tonProof, accountPublicKey: account?.publicKey });

    if (!account || !tonProof || !account.publicKey) {
      setToken(undefined);

      return;
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

    setToken(token);

    return token;
  }, [account, bot, tonProof]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    token,
    refetch,
    loading: token === undefined,
  };
};
