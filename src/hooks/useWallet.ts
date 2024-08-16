import { toNano } from '@ton/core/dist/utils/convert';

import {
  useTonConnectUI,
  useTonWallet,
  SendTransactionRequest,
  TonProofItemReplySuccess,
  TonProofItemReplyError,
  TonConnectUI,
  Account,
} from '@tonconnect/ui-react';

export type TransferArgs = {
  to: string;
  amount: number;
};

export type Wallet = {
  account?: Account;
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

  ui.sendTransaction(request);
};

export const useWallet = (): Wallet => {
  const [ui] = useTonConnectUI();
  const { account, connectItems } = useTonWallet() || {};

  ui.setConnectRequestParameters({
    state: 'ready',
    value: {
      tonProof: '1234', // TODO: Replace with a challage from the bot
    },
  });

  return {
    account,
    tonProof: isSuccessfulProof(connectItems?.tonProof) ? connectItems.tonProof : undefined,
    transfer: transfer.bind(null, ui),
    disconnect: () => ui.disconnect(),
    connect: () => ui.openModal(),
  };
};
