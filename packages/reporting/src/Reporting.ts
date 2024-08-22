import {
  init,
  captureException,
  captureMessage,
  BrowserOptions,
  SeverityLevel,
  setUser,
  EventHint,
  Event,
  captureEvent,
} from '@sentry/react';

export type ReportingOptions = Pick<BrowserOptions, 'environment'> & {
  appVersion: string;
  tags?: Record<string, any>;
};

export type ReportingUser = {
  id: string;
  username?: string;
  email?: string;
};

export class Reporting {
  constructor(private options: BrowserOptions) {}

  init({ appVersion, tags, environment }: ReportingOptions) {
    init({
      ...this.options,
      environment,
      release: `developer-console-client@${appVersion}`,
      initialScope: { tags },
    });
  }

  error = (error: any, hint?: EventHint) => {
    console.error('Reporting:', error);

    captureException(error, hint);
  };

  message = (message: string, tags?: Record<string, any>, level: Exclude<SeverityLevel, 'fatal'> = 'log') => {
    console[level === 'warning' ? 'warn' : level]('Reporting:', message);

    captureMessage(message, { level, tags });
  };

  event = (event: Event, hint?: EventHint) => {
    console.log('Reporting:', event);

    captureEvent(event, hint);
  };

  setUser = (user: ReportingUser) => setUser(user);
  clearUser = () => setUser(null);
}
