import { useEffect, useState } from 'react';

export function useTelegramTextColor() {
  const [color, setColor] = useState('inherit');

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const platform = window.Telegram?.WebApp?.platform || 'web';
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const colorScheme = window.Telegram?.WebApp?.colorScheme || 'light';

    if (platform === 'web' && colorScheme === 'dark') {
      setColor('#000');
    } else {
      setColor('inherit');
    }
  }, []);

  return color;
}
