import { Headline } from '@telegram-apps/telegram-ui';

import './Benefits.css';
import { PropsWithChildren } from 'react';

export type BenefitsProps = PropsWithChildren;
export type BenefitsItemProps = PropsWithChildren<{
  before?: React.ReactNode;
}>;

export const Benefits = ({ children }: BenefitsProps) => <div className="Benefits-root">{children}</div>;

Benefits.Item = ({ before, children }: BenefitsItemProps) => (
  <div className="BenefitsItem-root">
    <div className="BenefitsItem-before">{before}</div>
    <Headline weight="2" className="BenefitsItem-content">
      {children}
    </Headline>
  </div>
);
