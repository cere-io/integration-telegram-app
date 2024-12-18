import { useCereWallet } from '../cere-wallet';
import { createContext, FC, ReactNode, useEffect, useState } from 'react';
import { CereWalletSigner, EventSource } from '@cere-activity-sdk/events';
import { EVENT_APP_ID, EVENT_DISPATCH_URL, EVENT_LISTEN_URL } from '../constants';

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

  useEffect(() => {
    if (!cereWallet) return;

    const client = new EventSource(new CereWalletSigner(cereWallet), {
      appId: EVENT_APP_ID,
      dispatchUrl: EVENT_DISPATCH_URL,
      listenUrl: EVENT_LISTEN_URL,
    });

    const connectToClient = async () => {
      try {
        console.log('Connecting to EventsClient...');
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
  }, [cereWallet]);

  return <EventsContext.Provider value={{ eventSource }}>{children}</EventsContext.Provider>;
};
