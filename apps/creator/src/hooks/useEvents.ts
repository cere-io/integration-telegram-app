import { useMemo } from 'react';
import { CereWalletSigner, EventSource } from '@cere-activity-sdk/events';
import { EVENT_APP_ID, EVENT_DISPATCH_URL, EVENT_LISTEN_URL } from '../constants.ts';
import { useCereWallet } from '../cere-wallet';

export const useEvents = () => {
  const cereWallet = useCereWallet();

  return useMemo(() => {
    return new EventSource(new CereWalletSigner(cereWallet), {
      appId: EVENT_APP_ID,
      dispatchUrl: EVENT_DISPATCH_URL,
      listenUrl: EVENT_LISTEN_URL,
    });
  }, [cereWallet]);
};
