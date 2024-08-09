import { useState } from 'react';
import { Tabbar, MediaIcon, WalletIcon } from '@tg-app/ui';

import { Media, Wallet } from './screens';

const tabs = [
  {
    icon: MediaIcon,
    screen: Media,
    text: 'Media',
  },
  {
    icon: WalletIcon,
    screen: Wallet,
    text: 'Wallet',
  },
];

export const App = () => {
  const [activeTab, setActiveTab] = useState(0);
  const Screen = tabs[activeTab].screen;

  return (
    <>
      <Screen />

      <Tabbar>
        {tabs.map(({ icon: Icon, text }, index) => (
          <Tabbar.Item key={index} text={text} selected={activeTab === index} onClick={() => setActiveTab(index)}>
            <Icon size={26} style={{ margin: 2 }} />
          </Tabbar.Item>
        ))}
      </Tabbar>
    </>
  );
};
