import { useCereWallet } from '../cere-wallet';
import { createContext, FC, ReactNode, useEffect, useState } from 'react';
import { CereWalletSigner, EventSource } from '@cere-activity-sdk/events';
import {
  APP_PUBLIC_KEY,
  DATA_SERVICE_PUBLIC_KEY,
  EVENT_APP_ID,
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
    if (!cereWallet) return;

    let client: EventSource;

    const connectToClient = async () => {
      try {
        console.log('Connecting to EventsClient...');

        const signer = new CereWalletSigner(cereWallet);
        await signer.isReady();
        const cipher = new CereWalletCipher(cereWallet);
        await cipher.isReady();

        const authorization = await signer.sign('authorization');
        const userPubKey = signer.address;
        const dataServiceEdek = await agentServiceRegistry.getEdek(userPubKey, DATA_SERVICE_PUBLIC_KEY, authorization);
        if (!dataServiceEdek) {
          console.log('Data service EDEK not found');
          await cereWallet.isConnected;
          const edek = await cereWallet.naclBoxEdek(DATA_SERVICE_PUBLIC_KEY);
          const savedEdek = await agentServiceRegistry.saveEdek(
            {
              edek,
              userPubKey,
              dataServicePubKey: DATA_SERVICE_PUBLIC_KEY,
            },
            authorization,
          );
          if (!savedEdek) {
            console.log('Failed to store data service EDEK');
            return;
          }
          console.log('Data service EDEK successfully stored', edek);
        }

        client = new EventSource(signer, cipher, {
          appId: EVENT_APP_ID,
          dispatchUrl: EVENT_DISPATCH_URL,
          listenUrl: EVENT_LISTEN_URL,
          dataServicePubKey: DATA_SERVICE_PUBLIC_KEY,
          appPubKey: APP_PUBLIC_KEY,
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
      client.disconnect();
    };
  }, [cereWallet, agentServiceRegistry]);

  return <EventsContext.Provider value={{ eventSource }}>{children}</EventsContext.Provider>;
};
