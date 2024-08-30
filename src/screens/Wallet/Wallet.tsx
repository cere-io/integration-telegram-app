import { useState } from 'react';
import Reporting from '@tg-app/reporting';
import {
  Benefits,
  WalletWidget,
  Snackbar,
  Caption,
  Headline,
  IconBanner,
  HeartIcon,
  Subheadline,
  Button,
} from '@tg-app/ui';

import { useSubscriptions, useWallet, useWalletSubscriptions } from '~/hooks';

type WalletProps = {
  setActiveTab: (index: number) => void;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const Wallet = (_props: WalletProps) => {
  const wallet = useWallet();
  const [hasToast, setHasToast] = useState(false);
  const [inProgress, setInProgress] = useState(false);
  const { data: allSubscriptions } = useSubscriptions();
  const { loading, data: currentSubscription, sync: syncSubscription } = useWalletSubscriptions(wallet.address);

  const targetPlan = allSubscriptions?.subscriptions[0];

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

  return (
    <>
      <WalletWidget
        address={wallet.address}
        onConnect={() => wallet.connect()}
        onDisconnect={() => wallet.disconnect()}
      />

      <div style={{ marginTop: 16, padding: 16 }}>
        {(!loading || !wallet.address) && !currentSubscription && (
          <div style={{ textAlign: 'center' }}>
            <Headline weight="2" style={{ marginBottom: 12 }}>
              Unlock Premium Access
            </Headline>

            <Caption style={{ display: 'block', marginBottom: 12 }}>
              Experience the best of our service with a premium subscription. Enjoy exclusive features, ad-free
              browsing, priority support, and much more. Elevate your experience and get the most out of your
              subscription today!
            </Caption>

            <Benefits>
              <Benefits.Item before="✨">Ad-free viewing</Benefits.Item>
              <Benefits.Item before="💎️">Exclusive series</Benefits.Item>
              <Benefits.Item before="🤙">Cancel anytime</Benefits.Item>
            </Benefits>
          </div>
        )}

        {!loading && currentSubscription && (
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
        )}

        {!loading && !currentSubscription && targetPlan && (
          <Button stretched size="l" loading={inProgress} style={{ marginTop: 16 }} onClick={handleSubscribe}>
            Subscribe for ${targetPlan.price} TON per {targetPlan.durationInDays} days
          </Button>
        )}
      </div>

      {hasToast && (
        <Snackbar description="Your order is complete! Thank you for your purchase." onClose={() => setHasToast(false)}>
          Welcome to Premium! 🎉
        </Snackbar>
      )}
    </>
  );
};
