import { useMemo } from 'react';
import { EventSource } from '@cere-activity-sdk/events';
import { u8aToU8a } from '@polkadot/util';
import { useWallet } from '~/hooks/useWallet.ts';
import { PublicKeySigner } from '@cere/media-sdk-react';

export const useEvents = () => {
  const { account } = useWallet();

  const publicKeyArray = u8aToU8a(account?.publicKey);

  const signer = useMemo(
    () =>
      new PublicKeySigner(publicKeyArray, {
        type: 'ed25519',
      }),
    [publicKeyArray],
  );

  return useMemo(() => {
    const source = new EventSource(signer, {
      appId: '2102',
      dispatchUrl: 'https://stage-ai-event-service.core-stage.aws.cere.io',
      listenUrl: 'https://socket.dev.cere.io',
    });

    source.isReady().then(
      (ready) => {
        console.log('EventSource ready:', ready);
      },
      (error) => {
        console.error('EventSource error:', error);
      },
    );

    return source;
  }, [signer]);
};
