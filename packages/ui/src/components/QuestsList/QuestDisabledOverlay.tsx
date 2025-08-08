import { Text, Title } from '@tg-app/ui';
import React from 'react';

interface QuestDisabledOverlayProps {
  title?: string;
  subtitle?: string;
  style?: React.CSSProperties;
}

export const QuestDisabledOverlay: React.FC<QuestDisabledOverlayProps> = ({
  title = 'This campaign has ended',
  subtitle = '',
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10,
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      textAlign: 'center',
      borderRadius: '12px',
      ...style,
    }}
  >
    <div>
      <Title level="3" weight="2" style={{ marginBottom: 4 }}>
        {title}
      </Title>
      <Text>{subtitle}</Text>
    </div>
  </div>
);
