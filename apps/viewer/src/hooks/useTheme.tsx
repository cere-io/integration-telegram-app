import { useEffect, useState } from 'react';
import { useWebApp } from '@vkruglikov/react-telegram-web-app';

export const useTheme = () => {
  const miniApp = useWebApp();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const themeParams = miniApp.themeParams;
    const isDarkTheme = themeParams?.bg_color === '#18222d';
    setTheme(isDarkTheme ? 'dark' : 'light');
  }, [miniApp.themeParams]);

  return theme;
};
