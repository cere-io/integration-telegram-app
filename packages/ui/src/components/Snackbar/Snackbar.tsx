import { Snackbar as UiSnackbar, SnackbarProps as UiSnackbarProps } from '@telegram-apps/telegram-ui';

import './Snackbar.css';

export type SnackbarProps = UiSnackbarProps;
export const Snackbar = (props: SnackbarProps) => <UiSnackbar {...props} className="Snackbar-root" />;
