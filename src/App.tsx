import { useState } from 'react';
import { useLaunchParams } from '@telegram-apps/sdk-react';
import { Tabbar, MediaIcon, WalletIcon, Provider as UIProvider } from '@tg-app/ui';

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
  const { platform, themeParams } = useLaunchParams();
  console.log('App Start', { platform, themeParams });

  const [activeTab, setActiveTab] = useState(0);
  const Screen = tabs[activeTab].screen;

  return (
    <UIProvider platform={platform === 'ios' ? 'ios' : 'base'}>
      <Screen />

      <Tabbar>
        {tabs.map(({ icon: Icon, text }, index) => (
          <Tabbar.Item key={index} text={text} selected={activeTab === index} onClick={() => setActiveTab(index)}>
            <Icon size={26} style={{ margin: 2 }} />
          </Tabbar.Item>
        ))}
      </Tabbar>
    </UIProvider>
  );
};
