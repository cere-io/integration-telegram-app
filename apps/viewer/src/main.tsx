import './mockEnv';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { SDKProvider } from '@telegram-apps/sdk-react';
import Reporting, { ErrorBoundary } from '@tg-app/reporting';
import Analytics from '@tg-app/analytics';

import { App } from './App';
import { APP_ENV, APP_VERSION, TELEGRAM_APP_URL, TONCONNECT_MANIFEST_URL } from './constants';
import { CereWalletProvider } from './cere-wallet';

Analytics.init();
Reporting.init({
  appVersion: APP_VERSION,
  environment: APP_ENV,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SDKProvider acceptCustomStyles debug>
    <TonConnectUIProvider
      manifestUrl={TONCONNECT_MANIFEST_URL}
      actionsConfiguration={{
        twaReturnUrl: TELEGRAM_APP_URL,
      }}
    >
      <CereWalletProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </CereWalletProvider>
    </TonConnectUIProvider>
  </SDKProvider>,
);
