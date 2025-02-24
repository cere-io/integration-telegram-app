import { useEffect } from 'react';

export const useHideTorusIframe = () => {
  useEffect(() => {
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const torusIframe = document.getElementById('torusIframe');
          if (torusIframe) {
            torusIframe.style.width = '0!important';
            torusIframe.style.height = '0!important';
            torusIframe.style.zIndex = '0!important';
            torusIframe.style.position = 'absolute';
            torusIframe.style.visibility = 'hidden';
            observer.disconnect();
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);
};
