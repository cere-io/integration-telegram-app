import './TopWidget.css';

import { Text, Title } from '@telegram-apps/telegram-ui';
import React from 'react';

type WrapperProps = {
  widgetImage?: string;
  children?: React.ReactNode;
};

const Wrapper = ({ widgetImage, children }: WrapperProps) => {
  if (widgetImage) {
    return (
      <div className="box-with-image">
        <img src={widgetImage} alt="" />
      </div>
    );
  }
  return <div className="styled-box">{children}</div>;
};

type TopWidgetProps = {
  widgetImage?: string;
};

export const TopWidget = ({ widgetImage }: TopWidgetProps) => {
  return (
    <Wrapper widgetImage={widgetImage}>
      <div className="content">
        <Title className="title white-text" style={{ marginBottom: 8 }}>
          Leaderboard
        </Title>
        <Text className="text white-text">
          Watch videos or complete other tasks to climb the leaderboard and earn rewards
        </Text>
      </div>
    </Wrapper>
  );
};
