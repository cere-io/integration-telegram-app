import { Title, Button, Text, Divider } from '@telegram-apps/telegram-ui';

import './WalletWidget.css';

import { ToncoinIcon } from '../../icons';
import walletImage from './wallet.png';

import { Truncate } from '../Truncate';
import { IconBanner } from '../IconBanner';

export type WalletWidgetProps = {
  address?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

export const WalletWidget = ({ address, onConnect }: WalletWidgetProps) => {
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
              header="48 TON" // TODO: Replace with actual balance
              icon={<ToncoinIcon />}
              description={
                <>
                  {'Toncoin - '}
                  <Truncate maxLength={8} variant="address" text={address} />
                </>
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
