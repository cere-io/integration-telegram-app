import { Spinner, SpinnerProps, Text } from '../../index.ts';
import './Loader.css';

export const Loader = ({ size = 's', style = {} }: { size: SpinnerProps['size']; style?: React.CSSProperties }) => (
  <div className="loader" style={style}>
    <Spinner size={size} />
    <Text>This is taking a bit longer than expected</Text>
  </div>
);
