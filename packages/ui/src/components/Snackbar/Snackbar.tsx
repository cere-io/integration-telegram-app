import './Snackbar.css';

import { Snackbar as UiSnackbar, SnackbarProps as UiSnackbarProps } from '@telegram-apps/telegram-ui';

export type SnackbarProps = UiSnackbarProps;
export const Snackbar = (props: SnackbarProps) => <UiSnackbar {...props} className="Snackbar-root" />;
