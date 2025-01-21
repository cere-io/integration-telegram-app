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
  const videoEnded = useRef(false); // Флаг для отслеживания завершения видео

  return useCallback(
    (currentTime: number, videoLength: number) => {
      if (!videoUrl || videoEnded.current) return;

      const currentSegmentId = Math.floor(currentTime / segmentLength);
      const totalSegments = Math.ceil(videoLength / segmentLength);

      if (currentTime >= videoLength) {
        console.log('Video ended, stopping segment tracking.');
        videoEnded.current = true;
        return;
      }

      if (watchedSegments.current.has(currentSegmentId)) return;

      console.log(`Segment ${currentSegmentId} watched`);
      watchedSegments.current.add(currentSegmentId);
      onSegmentWatched({
        segmentId: currentSegmentId,
        segmentLength,
        videoLength,
      });

      const lastSegmentEndTime = (totalSegments - 1) * segmentLength;
      if (
        currentSegmentId === totalSegments - 1 &&
        currentTime >= lastSegmentEndTime &&
        !watchedSegments.current.has(currentSegmentId)
      ) {
        console.log('Last segment watched');
        watchedSegments.current.add(currentSegmentId);
        onSegmentWatched({
          segmentId: currentSegmentId,
          segmentLength,
          videoLength,
        });
      }
    },
    [videoUrl, segmentLength, onSegmentWatched],
  );
};
