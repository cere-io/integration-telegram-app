import { useMemo } from 'react';
import { EventSource, UriSigner } from '@cere-activity-sdk/events';
// import { u8aToU8a } from '@polkadot/util';
// import { useWallet } from '~/hooks/useWallet.ts';
// import { PublicKeySigner } from '@cere/media-sdk-react';

export const useEvents = () => {
  // const { account } = useWallet();

  // const publicKeyArray = u8aToU8a(
  //   // TODO remove the string once tested
  //   '31a4e51cfcc492da79838bd4a2a59d694280e3feada2ff5f811f4916d9fbb0ac',
  // );

  // const signer = useMemo(
  //   () =>
  //     new PublicKeySigner(publicKeyArray, {
  //       type: 'ed25519',
  //     }),
  //   [publicKeyArray],
  // );

  const signer = useMemo(() => {
    return new UriSigner('wealth ski target play spring pizza jaguar shoe thrive wine soft bitter', {
      type: 'ethereum',
    });
  }, []);

  return useMemo(() => {
    return new EventSource(signer, {
      appId: '2102',
      dispatchUrl: 'https://stage-ai-event-service.core-stage.aws.cere.io',
      listenUrl: 'https://socket.dev.cere.io',
    });
  }, [signer]);
};
