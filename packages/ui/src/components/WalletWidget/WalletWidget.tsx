import { Banner, Button } from '@telegram-apps/telegram-ui';

import { Truncate } from '../Truncate';

export type WalletWidgetProps = {
  address?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

export const WalletWidget = ({ address, onConnect, onDisconnect }: WalletWidgetProps) => {
  return (
    <Banner
      header="Wallet"
      subheader={
        address ? <Truncate maxLength={20} variant="address" text={address} /> : 'Connect your wallet to continue'
      }
    >
      {address ? (
        <Button size="s" onClick={onDisconnect}>
          Disconnect
        </Button>
      ) : (
        <Button size="s" onClick={onConnect}>
          Connect
        </Button>
      )}
    </Banner>
  );
};
