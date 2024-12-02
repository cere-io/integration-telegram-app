import { useEffect, useState } from 'react';
import { SubscriptionsResponse } from '../../../../packages/api';

import { useBot } from './useBot';

export const useSubscriptions = () => {
  const bot = useBot();
  const [data, setData] = useState<SubscriptionsResponse>();

  useEffect(() => {
    bot.getSubscriptions().then(setData);
  }, [bot]);

  return {
    data,
    loading: data === undefined,
  };
};
