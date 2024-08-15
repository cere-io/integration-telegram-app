import { Title } from '@tg-app/ui';
import { useEffect } from 'react';

import { useBot } from '~/hooks';

export const Media = () => {
  const bot = useBot();

  useEffect(() => {
    console.log('Bot', bot);

    bot.getVideos().then(console.log.bind(console, 'Videos'));
    bot.getToken().then(console.log.bind(console, 'Token'));
    bot.getSubscriptions().then(console.log.bind(console, 'Subscriptions'));
  }, [bot]);

  return <Title>Media</Title>;
};
