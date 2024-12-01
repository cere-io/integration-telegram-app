import {
  bindMiniAppCSSVars,
  bindThemeParamsCSSVars,
  bindViewportCSSVars,
  useInitData,
  useMiniApp,
  useThemeParams,
  useViewport,
} from '@telegram-apps/sdk-react';
import { Tabbar, MediaIcon, Provider as UIProvider } from '@tg-app/ui';
import { useEffect, useState } from 'react';
import { ActiveTab } from '~/App.tsx';
import Reporting from '@tg-app/reporting';
import { VideoUpload } from '~/screens';

const ownerTabs = [
  {
    icon: MediaIcon,
    screen: VideoUpload,
    text: 'Your videos',
  },
];

export const AppOwner = () => {
  const miniApp = useMiniApp();
  const themeParams = useThemeParams();
  const viewport = useViewport();
  const { user } = useInitData() || {};

  const [activeTab, setActiveTab] = useState<ActiveTab>({ index: 0 });
  const Screen = ownerTabs[activeTab.index].screen;

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
    <UIProvider appearance={miniApp.isDark ? 'dark' : 'light'}>
      <Screen setActiveTab={setActiveTab} {...activeTab.props} />

      <Tabbar>
        {ownerTabs.map(({ icon: Icon, text }, index) => (
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
    </UIProvider>
  );
};
