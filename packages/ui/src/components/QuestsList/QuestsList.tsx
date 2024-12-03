import { PropsWithChildren } from 'react';

export type QuestsListProps = PropsWithChildren;

export const QuestsList = ({ children }: QuestsListProps) => {
  return <div style={{ marginTop: 16 }}>{children}</div>;
};
