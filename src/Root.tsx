import { App } from './App';
import { AppOwner } from './AppOwner';
import { IS_OWNER } from '~/constants.ts';

const Root = () => {
  return IS_OWNER ? <AppOwner /> : <App />;
};

export default Root;
