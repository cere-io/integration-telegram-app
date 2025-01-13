import { DEFAULT_START_PARAM } from '../constants.ts';
import { useInitData } from '@vkruglikov/react-telegram-web-app';

export const useStartParam = () => {
  const [initDataUnsafe] = useInitData() || {};

  return { startParam: initDataUnsafe?.start_param || DEFAULT_START_PARAM };
};
