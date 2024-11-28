import { useMemo } from 'react';
import { ActivityEvent, EventSource, UriSigner } from '@cere-activity-sdk/events';
import {
  EVENT_APP_ID,
  EVENT_DISPATCH_URL,
  EVENT_LISTEN_URL,
  EVENT_SIGNER_MNEMONIC,
  EVENT_SIGNER_TYPE,
} from '~/constants.ts';
import { useWallet } from '~/hooks';

export const useEvents = () => {
  const { account } = useWallet();

  const signer = useMemo(() => {
    return new UriSigner(EVENT_SIGNER_MNEMONIC, {
      type: EVENT_SIGNER_TYPE,
    });
  }, []);

  const eventSource = useMemo(() => {
    return new EventSource(signer, {
      appId: EVENT_APP_ID,
      dispatchUrl: EVENT_DISPATCH_URL,
      listenUrl: EVENT_LISTEN_URL,
    });
  }, [signer]);

  const dispatch = async (event_type: string, data: any) => {
    try {
      await eventSource.isReady();

      const event = new ActivityEvent(event_type, {
        ...data,
        timestamp: new Date().toISOString(),
        userPubKey: account?.publicKey,
        appPubKey: EVENT_APP_ID,
      });

      await eventSource.dispatchEvent(event);
    } catch (error) {
      console.error('Error dispatching event:', error);
    }
  };

  return {
    signer,
    eventSource,
    dispatch,
  };
};
