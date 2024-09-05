import { Button as UiButton, ButtonProps as UiButtonProps } from '@telegram-apps/telegram-ui';

import './Button.css';

export type ButtonProps = Omit<UiButtonProps, 'mode'> & {
  mode?: UiButtonProps['mode'] | 'cta';
};

export const Button = ({ mode, className, size = 'm', ...props }: ButtonProps) => {
  const finalMode = mode === 'cta' ? 'filled' : mode;
  const defaultClassName = `${className} Button-size-${size}`;
  const ctaClassName = defaultClassName ? `${defaultClassName} Button-cta` : 'Button-cta';
  const finalClassName = mode === 'cta' ? ctaClassName : defaultClassName;

  return <UiButton {...props} mode={finalMode} className={finalClassName} />;
};
