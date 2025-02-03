import { useEffect, useState, useCallback } from 'react';
import { useEvents } from '../hooks/useEvents.ts';
import { ActivityEvent } from '@cere-activity-sdk/events';

const EVENT_THROTTLE_TIME = 30 * 1000;

export const useEventQueue = () => {
  const [queue, setQueue] = useState<ActivityEvent[]>([]);
  const [lastSentEvent, setLastSentEvent] = useState<any | null>(null);
  const [lastSentTimestamp, setLastSentTimestamp] = useState<number>(0);

  const eventSource = useEvents();

  const addToQueue = (event: ActivityEvent) => {
    setQueue((prevQueue) => {
      const alreadyExists = prevQueue.some((q) => q.type === event.type);
      if (!alreadyExists) {
        return [...prevQueue, event];
      }
      return prevQueue;
    });
  };

  const sendEvent = useCallback(
    async (event: ActivityEvent) => {
      if (!eventSource) return;
      console.log('Sending event:', event);
      try {
        await eventSource.dispatchEvent(event);
      } catch (e) {
        console.error('Error sending event:', e);
      }
    },
    [eventSource],
  );

  const shouldThrottle = (event: any) => {
    if (!lastSentEvent) return false;

    return JSON.stringify(lastSentEvent.type) === JSON.stringify(event.type);
  };

  const processQueue = useCallback(async () => {
    const currentTime = Date.now();

    if (queue.length > 0) {
      const eventToSend = queue[0];

      if (shouldThrottle(eventToSend)) {
        const timeElapsed = currentTime - lastSentTimestamp;
        if (timeElapsed < EVENT_THROTTLE_TIME) {
          console.log('Event throttled, waiting...');
          return;
        }
      }

      try {
        await sendEvent(eventToSend);
      } catch (e) {
        console.error('Error sending event:', e);
      }

      setLastSentEvent(eventToSend);
      setLastSentTimestamp(currentTime);

      setQueue((prevQueue) => prevQueue.slice(1));
    }
  }, [queue, shouldThrottle, lastSentTimestamp, sendEvent]);

  useEffect(() => {
    const interval = setInterval(processQueue, 1000);

    return () => clearInterval(interval);
  }, [processQueue]);

  return { addToQueue };
};
