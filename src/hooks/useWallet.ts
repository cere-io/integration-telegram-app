import { useEffect, useMemo, useState } from 'react';
import { toNano } from '@ton/core/dist/utils/convert';
import Reporting from '@tg-app/reporting';
import {
  Account,
  useTonConnectUI,
  useTonWallet,
  SendTransactionRequest,
  TonProofItemReplySuccess,
  TonProofItemReplyError,
  TonConnectUI,
  toUserFriendlyAddress,
} from '@tonconnect/ui-react';

import { useBot } from './useBot';

export type TransferArgs = {
  to: string;
  amount: number;
};

export type Wallet = {
  address?: string;
  account?: Account;
  loading: boolean;
  transfer: (args: TransferArgs) => Promise<void>;
  disconnect: () => void;
  connect: () => void;
  tonProof?: TonProofItemReplySuccess;
};

const isSuccessfulProof = (
  proof?: TonProofItemReplySuccess | TonProofItemReplyError,
): proof is TonProofItemReplySuccess => {
  return !!proof && 'proof' in proof;
};

const transfer = async (ui: TonConnectUI, { to, amount }: TransferArgs) => {
  const validUntil = Math.floor(Date.now() / 1000) + 360;
  const request: SendTransactionRequest = {
    validUntil,
    messages: [
      {
        address: to,
        amount: toNano(amount).toString(),
      },
    ],
  };

  const { boc } = await ui.sendTransaction(request);

  console.log('Transfer completed', { boc });
  Reporting.message(`Transfer of ${amount} TON completed`, {
    event: 'transferCompleted',
    transferAmount: amount,
    walletAddress: ui.account && toUserFriendlyAddress(ui.account.address),
  });
};

export const useWallet = (): Wallet => {
  const bot = useBot();
  const [ui] = useTonConnectUI();
  const [loading, setLoading] = useState(true);
  const { account, connectItems } = useTonWallet() || {};

  const address = account?.address && toUserFriendlyAddress(account?.address);
  const storageKey = account?.address && `tonproof:${account.address}`;

  const tonProof = useMemo<TonProofItemReplySuccess>(() => {
    if (isSuccessfulProof(connectItems?.tonProof)) {
      return connectItems.tonProof;
    }

    const tonProofJson = storageKey && localStorage.getItem(storageKey);

    return tonProofJson ? JSON.parse(tonProofJson) : undefined;
  }, [connectItems, storageKey]);

  useEffect(() => {
    ui.connectionRestored.finally(() => setLoading(false));
    ui.setConnectRequestParameters({ state: 'loading' });
    bot.getProofChallenge().then((tonProof) => {
      ui.setConnectRequestParameters({ state: 'ready', value: { tonProof } });
    });
  }, [bot, ui]);

  useEffect(() => {
    if (tonProof && storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(tonProof));
    }
  }, [storageKey, tonProof]);

  useEffect(() => {
    if (address) {
      Reporting.message(`Wallet connected: ${address}`, {
        event: 'walletConnected',
        walletAddress: address,
      });
    }
  }, [address]);

  return {
    account,
    tonProof,
    address,
    loading,
    transfer: transfer.bind(null, ui),
    disconnect: () => ui.disconnect(),
    connect: () => ui.openModal(),
  };
};
