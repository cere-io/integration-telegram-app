import '@telegram-apps/telegram-ui/dist/styles.css';
import { AppRoot, AppRootProps } from '@telegram-apps/telegram-ui';

export type ProviderProps = AppRootProps;

export const Provider = ({ children, ...props }: ProviderProps) => {
  return (
    <AppRoot {...props}>
      <div
        style={{
          /**
           * TODO: Properly normalize styles instead of using a hardcoded value
           */
          padding: '8px',
          paddingBottom: '88px',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </AppRoot>
  );
};
