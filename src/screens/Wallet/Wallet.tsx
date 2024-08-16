import { useState } from 'react';
import { Subscription } from '@tg-app/api';
import { Section, WalletWidget, Cell, Badge, Snackbar } from '@tg-app/ui';

import { useSubscriptions, useWallet, useWalletSubscriptions } from '~/hooks';

export const Wallet = () => {
  const wallet = useWallet();
  const [hasToast, setHasToast] = useState(false);
  const [inProgress, setInProgress] = useState(false);
  const { data: allSubscriptions } = useSubscriptions();
  const { data: currentSubscription, sync: syncSubscription } = useWalletSubscriptions(wallet.address);
  const isConnected = !!wallet.address;

  const handleSubscribe =
    ({ price }: Subscription) =>
    async () => {
      const to = allSubscriptions!.destinationWallet;

      setInProgress(true);
      await wallet.transfer({ to, amount: price });
      await syncSubscription();
      setInProgress(false);

      setHasToast(true);
    };

  return (
    <>
      <WalletWidget
        address={wallet.address}
        onConnect={() => wallet.connect()}
        onDisconnect={() => wallet.disconnect()}
      />

      <Section header="Subscription">
        {allSubscriptions?.subscriptions.map((subscription) => (
          <Cell
            key={subscription.id}
            disabled={!isConnected || inProgress}
            subtitle={`${subscription.durationInDays} days for ${subscription.price} TON`}
            after={currentSubscription?.id === subscription.id ? <Badge type="number">Active</Badge> : undefined}
            onClick={handleSubscribe(subscription)}
          >
            {subscription.description}
          </Cell>
        ))}
      </Section>

      {hasToast && <Snackbar onClose={() => setHasToast(false)}>You are successfully subscribed!</Snackbar>}
    </>
  );
};
