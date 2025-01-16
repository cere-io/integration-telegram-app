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

/**
 * Hook for tracking video playback in segments.
 *
 * @param videoUrl - The URL of the video being tracked.
 * @param segmentLength - The length of each segment in seconds.
 * @param onSegmentWatched - Function that is called when a new segment is watched.
 *
 * @returns A function to be called on video time updates.
 * This function accepts:
 * - currentTime (the current playback time),
 * - videoLength (the total video length).
 */

export const useVideoSegmentTracker = ({ videoUrl, segmentLength, onSegmentWatched }: UseVideoSegmentTrackerProps) => {
  const watchedSegments = useRef<Set<number>>(new Set());
  const previousSegmentId = useRef<number | null>(null);

  return useCallback(
    (currentTime: number, videoLength: number) => {
      if (!videoUrl) return;

      const currentSegmentId = Math.floor(currentTime / segmentLength);
      const totalSegments = Math.ceil(videoLength / segmentLength);

      if (currentSegmentId === 0 && currentTime > 0 && !watchedSegments.current.has(currentSegmentId)) {
        console.log('First segment watched');
        watchedSegments.current.add(currentSegmentId);

        onSegmentWatched({
          segmentId: currentSegmentId,
          segmentLength,
          videoLength,
        });

        previousSegmentId.current = currentSegmentId;
      } else {
        if (!watchedSegments.current.has(currentSegmentId) && previousSegmentId.current === currentSegmentId - 1) {
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
        watchedSegments.current.add(currentSegmentId);

        onSegmentWatched({
          segmentId: currentSegmentId,
          segmentLength,
          videoLength,
        });

        previousSegmentId.current = currentSegmentId;
      }
    },
    [videoUrl, segmentLength, onSegmentWatched],
  );
};
