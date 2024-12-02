import '@telegram-apps/telegram-ui/dist/styles.css';
import { AppRoot, AppRootProps } from '@telegram-apps/telegram-ui';

export type ProviderProps = AppRootProps;

export const Provider = ({ children, ...props }: ProviderProps) => {
  return (
    <AppRoot {...props} >
      {children}
    </AppRoot>
  );
};
