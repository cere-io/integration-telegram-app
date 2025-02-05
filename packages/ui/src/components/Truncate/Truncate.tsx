import { AriaAttributes } from 'react';

export type TruncateProps = AriaAttributes & {
  text: string;
  maxLength?: number;
  endingLength?: number;
  variant?: 'text' | 'email' | 'address';
};

const getDefaultEndingLength = ({ text, variant, maxLength = text.length }: TruncateProps) => {
  if (variant === 'address') {
    return 4;
  }

  if (variant === 'email') {
    const [, domain] = text.split('@');

    return domain.length + 1;
  }

  return Math.round(maxLength / 2);
};

export const Truncate = ({
  text,
  variant = 'text',
  maxLength = text.length,
  endingLength = getDefaultEndingLength({ text, variant, maxLength }),
  ...props
}: TruncateProps) => {
  let truncatedText = text;

  if (maxLength < text.length) {
    const ending = text.slice(-endingLength);
    const truncated = text.slice(0, maxLength - endingLength);

    truncatedText = [truncated, ending].filter(Boolean).join('...');
  }

  return (
    <span {...props} data-full={text}>
      {truncatedText}
    </span>
  );
};
