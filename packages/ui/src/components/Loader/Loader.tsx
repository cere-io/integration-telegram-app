import { Spinner, SpinnerProps, Text } from '../../index.ts';
import './Loader.css';

export const Loader = ({ size = 's' }: { size: SpinnerProps['size'] }) => (
  <div className="loader" style={{}}>
    <Spinner size={size} />
    <Text>This is taking a bit longer than expected</Text>
  </div>
);
