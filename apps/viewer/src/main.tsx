import ReactDOM from 'react-dom/client';
import Reporting, { ErrorBoundary } from '@tg-app/reporting';
import Analytics from '@tg-app/analytics';

import { App } from './App';
import { APP_ENV, APP_VERSION } from './constants';
import { CereWalletProvider } from './cere-wallet';
import { EventsProvider } from './providers';
import { WebAppProvider } from '@vkruglikov/react-telegram-web-app';

Analytics.init();
Reporting.init({
  appVersion: APP_VERSION,
  environment: APP_ENV,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <WebAppProvider
    options={{
      smoothButtonsTransition: true,
    }}
  >
    <CereWalletProvider>
      <EventsProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </EventsProvider>
    </CereWalletProvider>
  </WebAppProvider>,
);
