import './Menu.css';

import { Content, Portal, Root, Trigger } from '@radix-ui/react-popover';
import { Button, ButtonProps, IconButton } from '@telegram-apps/telegram-ui';
import { PropsWithChildren } from 'react';

import { MenuIcon } from '../../icons';

export type MenuProps = PropsWithChildren;

export const Menu = ({ children }: MenuProps) => {
  return (
    <Root>
      <Trigger asChild>
        <div className="Menu-trigger">
          <IconButton mode="plain">
            <MenuIcon />
          </IconButton>
        </div>
      </Trigger>
      <Portal container={document.getElementById('app-root')}>
        <Content side="bottom" align="end">
          {children}
        </Content>
      </Portal>
    </Root>
  );
};

Menu.Button = (props: ButtonProps) => <Button {...props} mode="outline" className="Menu-item" />;
