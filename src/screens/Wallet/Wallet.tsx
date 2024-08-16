import { Section, WalletWidget, Cell, Badge } from '@tg-app/ui';

import { useSubscriptions, useWallet, useWalletSubscriptions } from '~/hooks';

export const Wallet = () => {
  const wallet = useWallet();
  const { data: allSubscriptions } = useSubscriptions();
  const { data: currentSubscription } = useWalletSubscriptions(wallet.address);
  const isConnected = !!wallet.address;

  return (
    <>
      <WalletWidget
        address={wallet.address}
        onConnect={() => wallet.connect()}
        onDisconnect={() => wallet.disconnect()}
      />

      <Section header="Subscription">
        {allSubscriptions?.subscriptions.map(({ id, description, durationInDays, price }) => (
          <Cell
            key={id}
            disabled={!isConnected}
            subtitle={`${durationInDays} days for ${price} TON`}
            after={currentSubscription?.id === id ? <Badge type="number">Active</Badge> : undefined}
          >
            {description}
          </Cell>
        ))}
      </Section>
    </>
  );
};
