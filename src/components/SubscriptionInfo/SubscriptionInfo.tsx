import { PropsWithChildren } from 'react';
import { Subscription } from '@tg-app/api';
import { Text } from '@tg-app/ui';
import { useMiniApp } from '@telegram-apps/sdk-react';

import './SubscriptionInfo.css';

import headerImage from './header.png';

export type SubscriptionInfoProps = PropsWithChildren<{
  subscription?: Subscription;
}>;

const benefits = ['🏋️‍♂️ Personalized Workouts', '🎓 Expert Guidance', '📈 Progress Tracking'];

export const SubscriptionInfo = ({ children }: SubscriptionInfoProps) => {
  const { isDark } = useMiniApp();
  const appearanceClass = `SubscriptionInfo-${isDark ? 'dark' : 'light'}`;

  return (
    <div className={`SubscriptionInfo-root ${appearanceClass}`}>
      <div className="SubscriptionInfo-header">
        <img src={headerImage} />
      </div>

      <Text Component="div" className="SubscriptionInfo-description">
        Unlock exclusive fitness content to reach your goals 💪
      </Text>

      <div className="SubscriptionInfo-benefits SubscriptionInfo-layer1">
        {benefits.map((title) => (
          <Text key={title} Component="div" className="SubscriptionInfo-benefit">
            {title}
          </Text>
        ))}
      </div>

      <div className="SubscriptionInfo-footer">{children}</div>
    </div>
  );
};
