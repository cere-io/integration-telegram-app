import { useCereWallet } from '../cere-wallet';
import { createContext, FC, ReactNode, useEffect, useState } from 'react';
import { CereWalletSigner, EventSource } from '@cere-activity-sdk/events';
import {
  MINI_APP_APP_PUBLIC_KEY,
  MINI_APP_DATA_SERVICE_PUBLIC_KEY,
  MINI_APP_APP_ID,
  EVENT_DISPATCH_URL,
  EVENT_LISTEN_URL,
} from '../constants';
import { useAgentServiceRegistry } from '../hooks/useAgentServiceRegistry.ts';
import { CereWalletCipher } from '@cere-activity-sdk/ciphers';

type EventsProviderProps = {
  children: ReactNode;
};

type EventsContextType = {
  eventSource: EventSource | null;
};

export const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const EventsProvider: FC<EventsProviderProps> = ({ children }) => {
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const cereWallet = useCereWallet();
  const agentServiceRegistry = useAgentServiceRegistry();

  useEffect(() => {
    async function shareEdek(signer: CereWalletSigner) {
      const authorization = await signer.sign('authorization');
      const userPubKey = signer.publicKey;

      const edekKey = `edek:${userPubKey}:${MINI_APP_DATA_SERVICE_PUBLIC_KEY}`;
      const edekShared = localStorage.getItem(edekKey) === 'true';
      if (edekShared) {
        console.log('Data service EDEK has already been shared');
        return;
      }

      const dataServiceEdek = await agentServiceRegistry.getEdek(
        userPubKey,
        MINI_APP_DATA_SERVICE_PUBLIC_KEY,
        authorization,
      );
      if (!dataServiceEdek) {
        console.log('Data service EDEK not found');
        await cereWallet.isConnected;
        const edek = await cereWallet.naclBoxEdek(MINI_APP_DATA_SERVICE_PUBLIC_KEY);
        const savedEdek = await agentServiceRegistry.saveEdek(
          {
            edek,
            userPubKey,
            dataServicePubKey: MINI_APP_DATA_SERVICE_PUBLIC_KEY,
          },
          authorization,
        );
        if (!savedEdek) {
          console.log('Failed to store data service EDEK');
          throw new Error('Failed to store data service EDEK');
        }
        console.log('Data service EDEK successfully stored', edek);
      }
      localStorage.setItem(edekKey, 'true');
    }

    if (!cereWallet) return;

    let client: EventSource;

    const connectToClient = async () => {
      try {
        console.log('Connecting to EventsClient...');

        const signer = new CereWalletSigner(cereWallet);
        await signer.isReady();
        const cipher = new CereWalletCipher(cereWallet);
        await cipher.isReady();

        await shareEdek(signer);

        client = new EventSource(signer, cipher, {
          appId: MINI_APP_APP_ID,
          dispatchUrl: EVENT_DISPATCH_URL,
          listenUrl: EVENT_LISTEN_URL,
          dataServicePubKey: MINI_APP_DATA_SERVICE_PUBLIC_KEY,
          appPubKey: MINI_APP_APP_PUBLIC_KEY,
        });

        await client.connect();
        setEventSource(client);
        console.log('EventsClient connected successfully.');
      } catch (error) {
        console.error('Failed to connect to EventsClient:', error);
      }
    };

    connectToClient();

    return () => {
      if (client && typeof client.disconnect === 'function') {
        client.disconnect();
      }
    };
  }, [cereWallet, agentServiceRegistry]);

  return <EventsContext.Provider value={{ eventSource }}>{children}</EventsContext.Provider>;
};
