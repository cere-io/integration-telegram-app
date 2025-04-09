import React, { memo, MutableRefObject, useEffect } from 'react';
import JSON5 from 'json5';

function normalizeTemplateData(html: string, isLeaderboard = false): any {
  if (isLeaderboard) {
    try {
      const match = html.match(/TEMPLATE_DATA\s*=\s*JSON\.stringify\((\{.*?\})\);/s);
      if (!match) return null;

      return JSON5.parse(match[1]);
    } catch {
      return null;
    }
  }

  try {
    const match = html.match(/TEMPLATE_DATA\s*=\s*(\{.*?\});/s);
    if (!match) return null;

    const data = JSON.parse(match[1]);

    if (data.remainingTime) {
      delete data.remainingTime.seconds;
    }

    return data;
  } catch {
    return null;
  }
}

function deepEqualIgnoringSeconds(obj1: any, obj2: any): boolean {
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
    return obj1 === obj2;
  }

  const keys1 = Object.keys(obj1).filter((key) => !(key === 'seconds' && obj1 === obj1.remainingTime));
  const keys2 = Object.keys(obj2).filter((key) => !(key === 'seconds' && obj2 === obj2.remainingTime));

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!deepEqualIgnoringSeconds(obj1[key], obj2[key])) return false;
  }

  return true;
}

type IframeRendererProps = {
  html: string;
  iframeRef: MutableRefObject<HTMLIFrameElement | null>;
  title: string;
  onLoad?: () => void;
  style?: React.CSSProperties;
  allow?: string;
};

export const IframeRenderer: React.FC<IframeRendererProps> = memo(
  ({ iframeRef, html, title, onLoad, style, allow }) => {
    useEffect(() => {
      if (iframeRef.current) {
        const iframe = iframeRef.current;
        const iframeDoc = iframe.contentDocument;

        if (iframeDoc) {
          iframe.style.opacity = '0';

          requestAnimationFrame(() => {
            iframeDoc.open();
            iframeDoc.write(html);
            iframeDoc.close();
          });

          const checkReady = () => {
            if (iframeDoc.readyState === 'complete') {
              setTimeout(() => {
                iframe.style.opacity = '1';
                onLoad?.();
              }, 100);
            } else {
              setTimeout(checkReady, 10);
            }
          };

          checkReady();
        }
      }
    }, [html, iframeRef, onLoad]);

    return (
      <iframe
        ref={iframeRef}
        title={title}
        allow={allow}
        style={{
          transition: 'opacity 0.2s ease-in-out',
          ...style,
        }}
      />
    );
  },
  (prevProps, nextProps) => {
    const prevData = normalizeTemplateData(prevProps.html, prevProps.html.includes('<div id="leaderboard"></div>'));
    const nextData = normalizeTemplateData(nextProps.html, nextProps.html.includes('<div id="leaderboard"></div>'));
    debugger;

    return deepEqualIgnoringSeconds(prevData, nextData);
  },
);
