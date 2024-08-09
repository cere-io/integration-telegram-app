import ReactDOM from 'react-dom/client';
import { Provider as UIProvider } from '@tg-app/ui';

import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <UIProvider>
    <App />
  </UIProvider>,
);
