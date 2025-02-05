import React, { memo, MutableRefObject, useEffect } from 'react';

function normalizeTemplateData(html: string): any {
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
  style?: React.CSSProperties;
  allow?: string;
};

export const IframeRenderer: React.FC<IframeRendererProps> = memo(
  ({ iframeRef, html, title, style }) => {
    useEffect(() => {
      if (iframeRef.current) {
        const iframeDoc = iframeRef.current.contentDocument;
        if (iframeDoc) {
          requestAnimationFrame(() => {
            iframeDoc.open();
            iframeDoc.write(html);
            iframeDoc.close();
          });
        }
      }
    }, [html, iframeRef]);

    return <iframe ref={iframeRef} title={title} style={style} />;
  },
  (prevProps, nextProps) => {
    const prevData = normalizeTemplateData(prevProps.html);
    const nextData = normalizeTemplateData(nextProps.html);

    return deepEqualIgnoringSeconds(prevData, nextData);
  },
);
