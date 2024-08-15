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
          padding: '8px',
          paddingBottom: '88px',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </AppRoot>
  );
};
