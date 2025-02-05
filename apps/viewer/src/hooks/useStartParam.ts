import { useInitData } from '@vkruglikov/react-telegram-web-app';

export const useStartParam = () => {
  const [initDataUnsafe] = useInitData() || {};
  const startParam = initDataUnsafe?.start_param;
  if (startParam) {
    const startParams = startParam.split('_');
    if (startParams.length == 1) {
      return { campaignId: startParam };
    } else {
      return { campaignId: startParams[0], referrerId: startParams[1] };
    }
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    return { campaignId: urlParams.get('campaignId'), referrerId: urlParams.get('referrerId') };
  }
};
