import { useEffect } from 'react';

export const useForceHideTorusIframe = () => {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const initDataRaw = window.Telegram?.WebApp?.initData || '';
    const isInTelegram = initDataRaw !== '';
    console.log(`In Telegram: ${isInTelegram}`);
    if (isInTelegram) {
      const observer = new MutationObserver(() => {
        const torusIframe = document.getElementById('torusIframe');
        if (torusIframe) {
          torusIframe.style.width = '0px';
          torusIframe.style.height = '0px';
          torusIframe.style.position = 'absolute';
          torusIframe.style.visibility = 'hidden';
          torusIframe.style.display = 'none';
          torusIframe.style.zIndex = '-2';
        }
      });

      const config = { attributes: true, childList: true, subtree: true };

      observer.observe(document.body, config);

      return () => observer.disconnect();
    }
  }, []);
};
