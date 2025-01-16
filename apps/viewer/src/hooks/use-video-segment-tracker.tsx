import { useCallback, useRef } from 'react';

export interface SegmentEvent {
  segmentId: number;
  segmentLength: number;
  videoLength: number;
}

interface UseVideoSegmentTrackerProps {
  videoUrl: string;
  segmentLength: number;
  onSegmentWatched: (eventData: SegmentEvent) => void;
}

export const useVideoSegmentTracker = ({ videoUrl, segmentLength, onSegmentWatched }: UseVideoSegmentTrackerProps) => {
  const watchedSegments = useRef<Set<number>>(new Set());
  const previousSegmentId = useRef<number | null>(null);

  return useCallback(
    (currentTime: number, videoLength: number) => {
      if (!videoUrl) return;

      const currentSegmentId = Math.floor(currentTime / segmentLength);
      const totalSegments = Math.ceil(videoLength / segmentLength);
      const lastSegmentEndTime = (totalSegments - 1) * segmentLength;

      if (currentSegmentId === 0 && !watchedSegments.current.has(currentSegmentId)) {
        console.log('First segment watched'); // @TODO remove log after testing
        watchedSegments.current.add(currentSegmentId);

        onSegmentWatched({
          segmentId: currentSegmentId,
          segmentLength,
          videoLength,
        });

        previousSegmentId.current = currentSegmentId;
      } else if (!watchedSegments.current.has(currentSegmentId)) {
        if (previousSegmentId.current === currentSegmentId - 1) {
          console.log(`Segment ${currentSegmentId} watched`); // @TODO remove log after testing

          watchedSegments.current.add(currentSegmentId);

          onSegmentWatched({
            segmentId: currentSegmentId,
            segmentLength,
            videoLength,
          });

          previousSegmentId.current = currentSegmentId;
        }
      }

      if (currentSegmentId === totalSegments - 1 && !watchedSegments.current.has(currentSegmentId)) {
        if (currentTime >= lastSegmentEndTime) {
          console.log('Last segment watched'); // @TODO remove log after testing
          watchedSegments.current.add(currentSegmentId);

          onSegmentWatched({
            segmentId: currentSegmentId,
            segmentLength,
            videoLength,
          });

          previousSegmentId.current = currentSegmentId;
        }
      }
    },
    [videoUrl, segmentLength, onSegmentWatched],
  );
};
