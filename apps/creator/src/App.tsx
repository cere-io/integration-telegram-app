import { useEffect, useState } from 'react';
import { Tabbar, MediaIcon, LockIcon, CampaignIcon } from '@tg-app/ui';
import Reporting from '../../../packages/reporting';
import {
  bindMiniAppCSSVars,
  useMiniApp,
  useThemeParams,
  useViewport,
  bindThemeParamsCSSVars,
  bindViewportCSSVars,
  useInitData,
} from '@telegram-apps/sdk-react';

import { Campaigns, Quests, Videos } from './screens';

import { AppRoot } from '@telegram-apps/telegram-ui';
import '@telegram-apps/telegram-ui/dist/styles.css';

const tabs = [
  {
    icon: MediaIcon,
    screen: Videos,
    text: 'Videos',
  },
  {
    icon: LockIcon,
    screen: Quests,
    text: 'Quests',
  },
  {
    icon: CampaignIcon,
    screen: Campaigns,
    text: 'Campaigns',
  },
];

export type ActiveTab = {
  index: number;
  props?: Record<string, unknown>;
};

export const App = () => {
  const miniApp = useMiniApp();
  const themeParams = useThemeParams();
  const viewport = useViewport();
  const { user } = useInitData() || {};

  const [activeTab, setActiveTab] = useState<ActiveTab>({ index: 0 });
  const Screen = tabs[activeTab.index].screen;

  useEffect(() => {
    bindMiniAppCSSVars(miniApp, themeParams);
    bindThemeParamsCSSVars(themeParams);

    if (viewport) {
      bindViewportCSSVars(viewport);
    }
  }, [miniApp, themeParams, viewport]);

  useEffect(
    () => (!user ? Reporting.clearUser() : Reporting.setUser({ id: user.id.toString(), username: user.username })),
    [user],
  );

  return (
    <AppRoot appearance={miniApp.isDark ? 'dark' : 'light'} className="App-root" id="app-root">
      <Screen setActiveTab={setActiveTab} {...activeTab.props} />

      <Tabbar>
        {tabs.map(({ icon: Icon, text }, index) => (
          <Tabbar.Item
            key={index}
            text={text}
            selected={activeTab.index === index}
            onClick={() => setActiveTab({ index })}
          >
            <Icon style={{ margin: 2, fontSize: 28 }} />
          </Tabbar.Item>
        ))}
      </Tabbar>
    </AppRoot>
  );
};
