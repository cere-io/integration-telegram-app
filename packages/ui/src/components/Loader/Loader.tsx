import { Spinner, SpinnerProps, Text } from '../../index.ts';
import './Loader.css';
import { useEffect, useState } from 'react';

export const Loader = ({ size = 's', style = {} }: { size: SpinnerProps['size']; style?: React.CSSProperties }) => {
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowText(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="loader" style={style}>
      <Spinner size={size} />
      {showText && <Text>This is taking a bit longer than expected</Text>}
    </div>
  );
};
