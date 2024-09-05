import { useState } from 'react';
import Reporting from '@tg-app/reporting';
import { WalletWidget, Snackbar, Caption, IconBanner, HeartIcon, Subheadline, Button } from '@tg-app/ui';

import type { ActiveTab } from '~/App';
import { useSubscriptions, useWallet, useWalletBalance, useWalletSubscriptions } from '~/hooks';
import { SubscriptionInfo } from '~/components';

type WalletProps = {
  showSubscribe?: boolean;
  setActiveTab: (tab: ActiveTab) => void;
};

export const Wallet = ({ showSubscribe = false }: WalletProps) => {
  const wallet = useWallet();
  const { balance, sync: syncBalance } = useWalletBalance(wallet.address);
  const [hasToast, setHasToast] = useState(false);
  const [inProgress, setInProgress] = useState(false);
  const { data: allSubscriptions } = useSubscriptions();
  const { loading, data: currentSubscription, sync: syncSubscription } = useWalletSubscriptions(wallet.address);
  const targetPlan = allSubscriptions?.subscriptions[0];
  const isLoading = loading || !wallet.address;

  const handleSubscribe = async () => {
    if (!targetPlan) {
      return;
    }

    const { price } = targetPlan;
    const to = allSubscriptions!.destinationWallet;

    setInProgress(true);

    try {
      await wallet.transfer({ to, amount: price });
      await syncSubscription();
      await syncBalance();

      setHasToast(true);

      Reporting.message(`User subscribed to ${price} TON plan`, {
        event: 'userSubscribed',
        walletAddress: wallet.address,
      });
    } catch (error) {
      Reporting.error(error);
    }

    setInProgress(false);
  };

  if (isLoading && !showSubscribe) {
    return null;
  }

  if (!currentSubscription) {
    return (
      <SubscriptionInfo subscription={targetPlan}>
        {targetPlan && (
          <Button mode="cta" stretched size="l" loading={inProgress} onClick={handleSubscribe}>
            Subscribe for {targetPlan.price} TON / {targetPlan.durationInDays} days
          </Button>
        )}
      </SubscriptionInfo>
    );
  }

  return (
    <>
      <WalletWidget
        address={wallet.address}
        balance={balance}
        onConnect={() => wallet.connect()}
        onDisconnect={() => wallet.disconnect()}
      />

      <div style={{ marginTop: 16, padding: 16 }}>
        <>
          <Subheadline weight="2" style={{ marginBottom: 12 }}>
            Active subscription
          </Subheadline>

          <IconBanner
            header="My subscription"
            icon={<HeartIcon />}
            description={`${currentSubscription.durationInDays} days for ${currentSubscription.price} TON`}
          />

          <Caption Component="div" style={{ marginTop: 12, color: 'var(--tgui--hint_color)' }}>
            This subscription renews automatically. You will be charged at the beginning of each billing cycle unless
            canceled beforehand.
          </Caption>
        </>
      </div>

      {hasToast && (
        <Snackbar description="Your order is complete! Thank you for your purchase." onClose={() => setHasToast(false)}>
          Welcome to Premium! 🎉
        </Snackbar>
      )}
    </>
  );
};
