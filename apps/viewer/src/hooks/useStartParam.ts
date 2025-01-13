import { DEFAULT_START_PARAM } from '../constants.ts';
import { useInitData } from '@vkruglikov/react-telegram-web-app';

export const useStartParam = () => {
  const [initDataUnsafe] = useInitData() || {};
  let startParam = initDataUnsafe?.start_param;
  if (!startParam) {
    startParam = new URLSearchParams(window.location.search).get('campaignId');
  }
  return { startParam: startParam || DEFAULT_START_PARAM };
};
