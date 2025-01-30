import { useEffect, useState, useCallback } from 'react';
import { useEvents } from '../hooks/useEvents.ts';

const EVENT_THROTTLE_TIME = 30 * 1000;

export const useEventQueue = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [lastSentEvent, setLastSentEvent] = useState<any | null>(null);
  const [lastSentTimestamp, setLastSentTimestamp] = useState<number>(0);

  console.log({ queue, lastSentEvent, lastSentTimestamp });

  const eventSource = useEvents();

  const addToQueue = (event: any) => {
    setQueue((prevQueue) => [...prevQueue, event]);
  };

  const sendEvent = async (event: any) => {
    if (!eventSource) return;
    console.log('Sending event:', event);
    await eventSource.dispatchEvent(event);
  };

  const shouldThrottle = (event: any) => {
    if (!lastSentEvent) return false;

    return JSON.stringify(lastSentEvent) === JSON.stringify(event);
  };

  const processQueue = useCallback(async () => {
    const currentTime = Date.now();

    // Если событие не повторяется, отправляем его
    if (queue.length > 0) {
      const eventToSend = queue[0];

      if (shouldThrottle(eventToSend)) {
        const timeElapsed = currentTime - lastSentTimestamp;

        if (timeElapsed < EVENT_THROTTLE_TIME) {
          console.log('Event throttled, waiting...');
          return;
        }
      }

      await sendEvent(eventToSend);

      setLastSentEvent(eventToSend);
      setLastSentTimestamp(currentTime);

      setQueue((prevQueue) => prevQueue.slice(1));
    }
  }, [queue, lastSentEvent, lastSentTimestamp]);

  useEffect(() => {
    const interval = setInterval(processQueue, 1000);

    return () => clearInterval(interval);
  }, [processQueue]);

  return { addToQueue };
};
