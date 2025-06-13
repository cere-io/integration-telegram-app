import './Button.css';

import { Button as UiButton, ButtonProps as UiButtonProps } from '@telegram-apps/telegram-ui';

type Mode = NonNullable<UiButtonProps['mode']> | 'cta' | 'link';

export type ButtonProps = Omit<UiButtonProps, 'mode'> & {
  mode?: Mode;
};

const modeMap: Record<Mode, UiButtonProps['mode']> = {
  cta: 'filled',
  link: 'plain',
  bezeled: 'bezeled',
  filled: 'filled',
  gray: 'gray',
  outline: 'outline',
  plain: 'plain',
  white: 'white',
};

export const Button = ({ mode = 'filled', className, size = 'm', ...props }: ButtonProps) => {
  const defaultClassName = `${className} Button-size-${size} Button-mode-${mode}`;
  const ctaClassName = defaultClassName ? `${defaultClassName} Button-cta` : 'Button-cta';
  const finalClassName = mode === 'cta' ? ctaClassName : defaultClassName;

  return <UiButton {...props} mode={modeMap[mode]} className={finalClassName} />;
};
