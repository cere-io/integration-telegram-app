import { Tabbar as UiTabbar, TabbarProps as UiTabbarProps } from '@telegram-apps/telegram-ui';

import './Tabbar.css';

export type TabbarProps = UiTabbarProps;
export const Tabbar = (props: TabbarProps) => <UiTabbar {...props} className="Tabbar-root" />;

Tabbar.Item = UiTabbar.Item;
