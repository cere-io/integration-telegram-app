import './ProgressBar.css';

import React, { FC, ReactNode } from 'react';

type ProgressBarProps = {
  height?: string;
  backgroundColor?: string;
  borderRadius?: string;
  children: ReactNode;
};

type ProgressFillProps = {
  value: number;
  fillColor?: string;
  borderRadius?: string;
};

export const ProgressBar: FC<ProgressBarProps> = ({ height, backgroundColor, borderRadius, children }) => {
  return (
    <div
      className="progressBar"
      style={{
        height: height || '4px',
        backgroundColor: backgroundColor || '#e5e7eb',
        borderRadius: borderRadius || '2px',
      }}
    >
      {children}
    </div>
  );
};

export const ProgressFill: React.FC<ProgressFillProps> = ({ value, fillColor, borderRadius }) => {
  return (
    <div
      className="progressFill"
      style={{
        width: `${value}%`,
        backgroundColor: fillColor || '#3b82f6',
        borderRadius: borderRadius || '2px',
      }}
    />
  );
};
