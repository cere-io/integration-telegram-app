import { useEffect, useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<any>({
    appearance: 'light',
    platform: 'web',
    bgColor: '#ffffff',
    textColor: '#000000',
    hintColor: '#888888',
  });

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    const update = () => {
      setTheme({
        appearance: tg.colorScheme,
        platform: tg.platform,
        bgColor: tg.themeParams.bg_color,
        textColor: tg.themeParams.text_color,
        hintColor: tg.themeParams.hint_color,
      });
    };
    tg.onEvent('themeChanged', update);
    tg.ready();
    update();
    return () => tg.offEvent('themeChanged', update);
  }, []);

  return theme;
}
