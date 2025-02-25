import { RmsService } from '@tg-app/rms-service';
import { RMS_URL } from '../constants.ts';

export const useRmsService = () => {
  return new RmsService(RMS_URL);
};
