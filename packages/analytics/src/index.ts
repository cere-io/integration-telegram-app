import { Analytics } from './Analytics';
import { GTM_ID } from './constants';

const defaultInstance = new Analytics({
  gtmId: GTM_ID,
  enabled: !!GTM_ID,
});

export * from './identifiers';
export const trackEvent = defaultInstance.trackEvent;

export default defaultInstance;
