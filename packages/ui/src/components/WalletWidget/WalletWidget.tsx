import { Title, Button, Text, Divider, Skeleton } from '@telegram-apps/telegram-ui';

import './WalletWidget.css';

import { DisconnectIcon, ToncoinIcon } from '../../icons';
import walletImage from './wallet.png';

import { Truncate } from '../Truncate';
import { IconBanner } from '../IconBanner';
import { Menu } from '../Menu';

export type WalletWidgetProps = {
  address?: string;
  balance?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

export const WalletWidget = ({ address, balance, onConnect, onDisconnect }: WalletWidgetProps) => {
  return (
    <>
      <div className="WalletWidget-root">
        <div className="WalletWidget-wallet">
          <div className="WalletWidget-image">
            <img src={walletImage} />
          </div>

          <Title level="2" weight="2" className="WalletWidget-title">
            Wallet
          </Title>

          {!address && <Text className="WalletWidget-caption">Connect your wallet to continue</Text>}
        </div>

        <div className="WalletWidget-actions">
          {address ? (
            <IconBanner
              header={balance ? `${balance} TON` : <Skeleton visible style={{ height: 21, width: 100 }} />}
              icon={<ToncoinIcon />}
              description={
                <>
                  {'Toncoin - '}
                  <Truncate maxLength={8} variant="address" text={address} />
                </>
              }
              after={
                <Menu>
                  <Menu.Button before={<DisconnectIcon size={18} />} onClick={onDisconnect}>
                    Disconnect wallet
                  </Menu.Button>
                </Menu>
              }
            />
          ) : (
            <Button mode="bezeled" onClick={onConnect}>
              Connect
            </Button>
          )}
        </div>
      </div>
      <Divider />
    </>
  );
};
