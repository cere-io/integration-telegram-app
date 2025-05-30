import { useInitData } from '@vkruglikov/react-telegram-web-app';

export const useStartParam = () => {
  const [initDataUnsafe] = useInitData() || {};
  const startParam = initDataUnsafe?.start_param;

  if (startParam) {
    const params = new URLSearchParams(startParam);
    const campaignId = params.get('campaignId');
    const organizationId = params.get('organizationId');
    const referrerId = params.get('referrerId');

    if (campaignId || organizationId || referrerId) {
      return { campaignId, organizationId, referrerId };
    }

    const parts = startParam.split('_');
    if (parts.length === 1) {
      return { campaignId: startParam };
    } else {
      return { campaignId: parts[0], referrerId: parts[1] };
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  return {
    campaignId: urlParams.get('campaignId'),
    organizationId: urlParams.get('organizationId'),
    referrerId: urlParams.get('referrerId'),
  };
};
