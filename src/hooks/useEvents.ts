import { useMemo } from 'react';
import { EventSource, UriSigner } from '@cere-activity-sdk/events';
import {
  EVENT_APP_ID,
  EVENT_DISPATCH_URL,
  EVENT_LISTEN_URL,
  EVENT_SIGNER_MNEMONIC,
  EVENT_SIGNER_TYPE,
} from '~/constants.ts';

export const useEvents = () => {
  const signer = useMemo(() => {
    return new UriSigner(EVENT_SIGNER_MNEMONIC, {
      type: EVENT_SIGNER_TYPE,
    });
  }, []);

  return useMemo(() => {
    return new EventSource(signer, {
      appId: EVENT_APP_ID,
      dispatchUrl: EVENT_DISPATCH_URL,
      listenUrl: EVENT_LISTEN_URL,
    });
  }, [signer]);
};
