import { ActivityEvent } from '@cere-activity-sdk/events';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useEvents } from '../hooks/useEvents.ts';

const EVENT_THROTTLE_TIME = 30 * 1000;

export const useEventQueue = () => {
  const [queue, setQueue] = useState<ActivityEvent[]>([]);
  const eventSource = useEvents();

  const lastSentEvent = useRef<ActivityEvent | null>(null);
  const lastSentTimestamp = useRef<number>(0);

  const addToQueue = useCallback((event: ActivityEvent) => {
    setQueue((prevQueue) => {
      const eventExists = prevQueue.some(
        (q) => q.type === event.type && JSON.stringify(q.payload) === JSON.stringify(event.payload),
      );

      if (!eventExists) {
        return [...prevQueue, event];
      }

      return prevQueue;
    });
  }, []);

  const sendEvent = useCallback(
    async (event: ActivityEvent) => {
      if (!eventSource) return;
      console.log('Sending event:', event);
      try {
        await eventSource.dispatchEvent(event);
        lastSentEvent.current = event;
        lastSentTimestamp.current = Date.now();
      } catch (e) {
        console.error('Error sending event:', e);
      }
    },
    [eventSource],
  );

  const shouldThrottle = useCallback((event: ActivityEvent) => {
    if (!lastSentEvent.current) return false;
    if (JSON.stringify(lastSentEvent.current) !== JSON.stringify(event)) return false;

    const timeElapsed = Date.now() - lastSentTimestamp.current;
    return timeElapsed < EVENT_THROTTLE_TIME;
  }, []);

  useEffect(() => {
    if (queue.length === 0) return;

    const processQueue = async () => {
      const eventToSend = queue[0];

      if (shouldThrottle(eventToSend)) {
        console.log('Event throttled, waiting...');
        return;
      }

      await sendEvent(eventToSend);
      setQueue((prevQueue) => prevQueue.slice(1));
    };

    const timeout = setTimeout(processQueue, 1000);
    return () => clearTimeout(timeout);
  }, [queue, sendEvent, shouldThrottle]);

  return { addToQueue };
};
