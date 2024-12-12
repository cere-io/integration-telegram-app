import { DEFAULT_START_PARAM } from '../constants.ts';
import { useInitData } from '@telegram-apps/sdk-react';

export const useStartParam = () => {
  const { startParam = DEFAULT_START_PARAM } = useInitData() || {};

  return { startParam };
};
