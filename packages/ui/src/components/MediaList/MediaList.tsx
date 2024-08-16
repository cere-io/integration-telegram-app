import { PropsWithChildren } from 'react';

export type MediaListProps = PropsWithChildren;

export const MediaList = ({ children }: MediaListProps) => {
  return <div style={{ marginTop: 16 }}>{children}</div>;
};
