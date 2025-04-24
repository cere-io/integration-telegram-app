import TagManager, { TagManagerArgs } from 'react-gtm-module';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export type AnalyticsOptions = TagManagerArgs & {
  enabled?: boolean;
};

export class GtmAnalytics {
  constructor(private options: AnalyticsOptions) {}

  init() {
    if (this.options.enabled === false) {
      return;
    }

    return TagManager.initialize(this.options);
  }

  trackEvent = (event: string, data: Record<string, any> = {}) => {
    window.dataLayer?.push({ event, ...data });
  };
}
