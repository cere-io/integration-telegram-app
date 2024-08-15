import { PropsWithChildren } from 'react';

export type MediaListProps = PropsWithChildren;

export const MediaList = ({ children }: MediaListProps) => {
  return <div>{children}</div>;
};
