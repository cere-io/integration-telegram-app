import './mockEnv';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { SDKProvider } from '@telegram-apps/sdk-react';

import { App } from './App';
import { TELEGRAM_APP_URL, TONCONNECT_MANIFEST_URL } from './constants';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SDKProvider acceptCustomStyles debug>
    <TonConnectUIProvider
      manifestUrl={TONCONNECT_MANIFEST_URL}
      actionsConfiguration={{
        twaReturnUrl: TELEGRAM_APP_URL,
      }}
    >
      <App />
    </TonConnectUIProvider>
  </SDKProvider>,
);
