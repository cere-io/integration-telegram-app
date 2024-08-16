import { useEffect } from 'react';
import { toNano } from '@ton/core/dist/utils/convert';
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

// export const CheckProofRequest = zod.object({
//   address: zod.string(),
//   network: zod.enum([CHAIN.MAINNET, CHAIN.TESTNET]),
//   public_key: zod.string(),
//   proof: zod.object({
//     timestamp: zod.number(),
//     domain: zod.object({
//       lengthBytes: zod.number(),
//       value: zod.string(),
//     }),
//     payload: zod.string(),
//     signature: zod.string(),
//     state_init: zod.string(),
//   }),
// });

export type TransferArgs = {
  to: string;
  amount: number;
};

export type Wallet = {
  address?: string;
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

  await ui.sendTransaction(request);
};

export const useWallet = (): Wallet => {
  const bot = useBot();
  const [ui] = useTonConnectUI();
  const { account, connectItems } = useTonWallet() || {};

  console.log('useWallet', { account, connectItems });

  useEffect(() => {
    ui.setConnectRequestParameters({ state: 'loading' });

    bot.getProofChallenge().then((tonProof) => {
      ui.setConnectRequestParameters({ state: 'ready', value: { tonProof } });

      console.log('Proof challange', tonProof);
    });
  }, [bot, ui]);

  return {
    account,
    address: account?.address && toUserFriendlyAddress(account?.address),
    tonProof: isSuccessfulProof(connectItems?.tonProof) ? connectItems.tonProof : undefined,
    transfer: transfer.bind(null, ui),
    disconnect: () => ui.disconnect(),
    connect: () => ui.openModal(),
  };
};
