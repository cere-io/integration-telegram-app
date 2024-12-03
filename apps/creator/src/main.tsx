import './mockEnv';
import ReactDOM from 'react-dom/client';
import { SDKProvider } from '@telegram-apps/sdk-react';
import Reporting, { ErrorBoundary } from '../../../packages/reporting';
import Analytics from '../../../packages/analytics';

import { App } from './App';
import { APP_ENV, APP_VERSION } from './constants';

Analytics.init();
Reporting.init({
  appVersion: APP_VERSION,
  environment: APP_ENV,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SDKProvider acceptCustomStyles debug>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </SDKProvider>,
);
