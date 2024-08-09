import '@telegram-apps/telegram-ui/dist/styles.css';
import { AppRoot, AppRootProps } from '@telegram-apps/telegram-ui';

export type ProviderProps = Pick<AppRootProps, 'children'>;

export const Provider = ({ children }: ProviderProps) => {
  return (
    <AppRoot>
      <div
        style={{
          /**
           * TODO: Properly normalize styles instead of using a hardcoded value
           */
          background: 'var(--tgui--bg_color)',
          height: '100vh',
          padding: '8px',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </AppRoot>
  );
};
