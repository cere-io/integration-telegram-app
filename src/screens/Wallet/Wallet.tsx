import { Title } from '@tg-app/ui';

import { useWallet } from '~/hooks';

export const Wallet = () => {
  const wallet = useWallet();

  return (
    <>
      <Title>Wallet</Title>

      <div style={{ width: 300, textOverflow: 'ellipsis', overflow: 'hidden' }}>Account: {wallet.account?.address}</div>
      <br />
      <button onClick={() => wallet.disconnect()}>Disconnect</button>
      <br />
      <br />
      <button onClick={() => wallet.connect()}>Connect</button>
      <br />
      <br />
      <button onClick={() => wallet.transfer({ to: 'UQCrGJMwoMHa26k2zqI4vxxCOyOfrhflTPlWpjaj5yIRbL4X', amount: 0.01 })}>
        Transfer
      </button>
    </>
  );
};
