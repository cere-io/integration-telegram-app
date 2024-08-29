import { Title, Button, Text, Divider } from '@telegram-apps/telegram-ui';

import './WalletWidget.css';
import walletImage from './wallet.png';
import { Truncate } from '../Truncate';

export type WalletWidgetProps = {
  address?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

export const WalletWidget = ({ address, onConnect, onDisconnect }: WalletWidgetProps) => {
  return (
    // <Banner
    //   header="Wallet"
    //   subheader={
    //     address ? <Truncate maxLength={20} variant="address" text={address} /> : 'Connect your wallet to continue'
    //   }
    // >
    <>
      <div className="WalletWidget-root">
        <div className="WalletWidget-wallet">
          <div className="WalletWidget-image">
            <img src={walletImage} />
          </div>

          <Title level="2" weight="2" className="WalletWidget-title">
            Wallet
          </Title>

          {address ? (
            <Text className="WalletWidget-address">
              <Truncate maxLength={20} variant="address" text={address} />
            </Text>
          ) : (
            <Text className="WalletWidget-caption">Connect your wallet to continue</Text>
          )}
        </div>

        <div className="WalletWidget-actions">
          {address ? (
            <Button mode="bezeled" onClick={onDisconnect}>
              Disconnect
            </Button>
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
