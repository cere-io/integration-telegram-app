import { PropsWithChildren } from 'react';
import { Subscription } from '@tg-app/api';
import { Text } from '@tg-app/ui';
import { useMiniApp } from '@telegram-apps/sdk-react';

import './SubscriptionInfo.css';

import { useWhiteLabel } from '~/hooks';

export type SubscriptionInfoProps = PropsWithChildren<{
  subscription?: Subscription;
}>;

export const SubscriptionInfo = ({ children }: SubscriptionInfoProps) => {
  const { isDark } = useMiniApp();
  const { subscription } = useWhiteLabel();
  const appearanceClass = `SubscriptionInfo-${isDark ? 'dark' : 'light'}`;

  return (
    <div className={`SubscriptionInfo-root ${appearanceClass}`}>
      <div className="SubscriptionInfo-header">
        <img src={subscription.imageUrl} />
      </div>

      <Text Component="div" className="SubscriptionInfo-description">
        {subscription.description}
      </Text>

      <div className="SubscriptionInfo-benefits SubscriptionInfo-layer1">
        {subscription.benefits.map((title) => (
          <Text key={title} Component="div" className="SubscriptionInfo-benefit">
            {title}
          </Text>
        ))}
      </div>

      <div className="SubscriptionInfo-footer">{children}</div>
    </div>
  );
};
