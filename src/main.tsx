import ReactDOM from 'react-dom/client';
import { Provider as UIProvider } from '@tg-app/ui';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { SDKProvider } from '@telegram-apps/sdk-react';

import { App } from './App';
import { TELEGRAM_APP_URL, TONCONNECT_MANIFEST_URL } from './constants';

console.log({ TONCONNECT_MANIFEST_URL });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SDKProvider acceptCustomStyles debug>
    <UIProvider>
      <TonConnectUIProvider
        manifestUrl={TONCONNECT_MANIFEST_URL}
        actionsConfiguration={{
          twaReturnUrl: TELEGRAM_APP_URL,
        }}
      >
        <App />
      </TonConnectUIProvider>
    </UIProvider>
  </SDKProvider>,
);
