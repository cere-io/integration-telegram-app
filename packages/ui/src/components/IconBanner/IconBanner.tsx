import { ReactNode } from 'react';
import { Banner, Caption } from '@telegram-apps/telegram-ui';

import './IconBanner.css';

export type IconBannerProps = {
  icon: ReactNode;
  header: ReactNode;
  description: ReactNode;
};

export const IconBanner = ({ icon, header, description }: IconBannerProps) => (
  <Banner
    className="IconBanner-root"
    type="inline"
    header={header}
    before={<div className="IconBanner-icon">{icon}</div>}
    subheader={<Caption>{description}</Caption>}
  />
);
