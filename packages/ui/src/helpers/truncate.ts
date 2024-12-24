type TruncateParams = {
  text: string;
  maxLength?: number;
  endingLength?: number;
  variant?: 'text' | 'hex';
};

export const truncateText = ({
  text,
  maxLength = text.length,
  endingLength,
  variant = 'text',
}: TruncateParams): string => {
  const getDefaultEndingLength = () => {
    if (variant === 'hex') {
      return 4;
    }
    return Math.round(maxLength / 2);
  };

  if (endingLength === undefined) {
    endingLength = getDefaultEndingLength();
  }

  if (maxLength < text.length) {
    const ending = text.slice(-endingLength);
    const truncated = text.slice(0, maxLength - endingLength);
    return [truncated, ending].filter(Boolean).join('...');
  }

  return text;
};
