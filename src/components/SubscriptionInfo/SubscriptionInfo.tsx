import { PropsWithChildren } from 'react';
import { Subscription } from '@tg-app/api';
import { Text, Title, Headline, Subheadline } from '@tg-app/ui';
import { useMiniApp } from '@telegram-apps/sdk-react';

import './SubscriptionInfo.css';

import Benefit1Icon from './benefit1.svg?react';
import Benefit2Icon from './benefit2.svg?react';
import Benefit3Icon from './benefit3.svg?react';

export type SubscriptionInfoProps = PropsWithChildren<{
  subscription?: Subscription;
}>;

const benefits = [
  { icon: Benefit1Icon, title: 'Personalized Workouts', description: 'Routines tailored just for you' },
  { icon: Benefit2Icon, title: 'Expert Guidance', description: 'Advice from certified trainers and nutritionists' },
  { icon: Benefit3Icon, title: 'Progress Tracking', description: 'Monitor your progress and stay motivated' },
];

export const SubscriptionInfo = ({ subscription, children }: SubscriptionInfoProps) => {
  const { isDark } = useMiniApp();
  const appearanceClass = `SubscriptionInfo-${isDark ? 'dark' : 'light'}`;

  return (
    <div className={`SubscriptionInfo-root ${appearanceClass}`}>
      <div className="SubscriptionInfo-bgLayer SubscriptionInfo-layer0"></div>

      <Title level="1" weight="1" className="SubscriptionInfo-title">
        Get Fit Faster
      </Title>

      <Text Component="div" className="SubscriptionInfo-description">
        Unlock exclusive fitness content to reach your goals
      </Text>

      <div className="SubscriptionInfo-benefits SubscriptionInfo-layer1">
        {benefits.map(({ icon: Icon, title, description }) => (
          <div key={title} className="SubscriptionInfo-benefit">
            <div className="SubscriptionInfo-benefitIcon">
              <Icon />
            </div>
            <div className="SubscriptionInfo-benefitContent">
              <Text Component="div" weight="1" className="SubscriptionInfo-benefitTitle">
                {title}
              </Text>
              <Text className="SubscriptionInfo-benefitDescription">{description}</Text>
            </div>
          </div>
        ))}
      </div>

      {subscription && (
        <>
          <div className="SubscriptionInfo-banner SubscriptionInfo-layer1">
            <Subheadline Component="div" weight="2" className="SubscriptionInfo-bannerTitle">
              Ready to take the next step? <br />
              Subscribe now and start your transformation!
            </Subheadline>

            <Text>Subscription</Text>
            <Headline weight="1" className="SubscriptionInfo-bannerSubscription">
              {subscription.price} TON / {subscription.durationInDays} days
            </Headline>
          </div>

          <div className="SubscriptionInfo-action SubscriptionInfo-layer1">{children}</div>
        </>
      )}
    </div>
  );
};
