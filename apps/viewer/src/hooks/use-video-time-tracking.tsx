import { useCallback, useEffect, useRef } from 'react';

export const useVideoTimeTracking = (onThresholdReached: (percentage: number) => void, threshold: number = 0.8) => {
  const realTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isThresholdReached = useRef(false);

  useEffect(() => {
    isThresholdReached.current = false;
  }, [threshold]);

  return useCallback(
    (currentTime: number, duration: number) => {
      if (currentTime < lastTimeRef.current) {
        return;
      }

      const timeDiff = currentTime - lastTimeRef.current;
      realTimeRef.current += timeDiff;

      const percentageWatched = realTimeRef.current / duration;
      if (percentageWatched >= threshold && !isThresholdReached.current) {
        isThresholdReached.current = true;
        onThresholdReached(percentageWatched * 100);
      }

      lastTimeRef.current = currentTime;
    },
    [onThresholdReached, threshold],
  );
};
