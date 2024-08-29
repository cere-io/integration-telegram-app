import { Title, Button, Text, Divider, Banner, Caption } from '@telegram-apps/telegram-ui';

import './WalletWidget.css';
import walletImage from './wallet.png';
import { Truncate } from '../Truncate';
import { ToncoinIcon } from '../../icons';

export type WalletWidgetProps = {
  address?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

export const WalletWidget = ({ address, onConnect, onDisconnect }: WalletWidgetProps) => {
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
            <Banner
              onClick={onDisconnect}
              style={{ margin: 0, padding: '16px 12px' }}
              type="inline"
              header="48 TON" // TODO: Replace with actual balance
              before={
                <div className="WalletWidget-icon">
                  <ToncoinIcon />
                </div>
              }
              subheader={
                <Caption>
                  {'Toncoin - '}
                  <Truncate maxLength={8} variant="address" text={address} />
                </Caption>
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
