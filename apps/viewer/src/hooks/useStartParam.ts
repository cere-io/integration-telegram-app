import { useInitData } from '@vkruglikov/react-telegram-web-app';

export const useStartParam = () => {
  const [initDataUnsafe] = useInitData() || {};
  const startParam = initDataUnsafe?.start_param;

  if (startParam) {
    const params = new URLSearchParams(startParam);
    const campaignId = Number(params.get('campaignId'));
    const organizationId = Number(params.get('organizationId'));
    const referrerId = params.get('referrerId');

    if (campaignId || organizationId || referrerId) {
      return { campaignId, organizationId, referrerId };
    }

    const colonMatch = startParam.match(/^(\w+):(\w+)$/);
    if (colonMatch) {
      const [, key, value] = colonMatch;
      if (key === 'org' || key === 'organizationId') {
        return { organizationId: Number(value) };
      } else if (key === 'campaign' || key === 'campaignId') {
        return { campaignId: Number(value) };
      } else if (key === 'ref') {
        return { referrerId: value };
      }
    }

    const parts = startParam.split('_');
    if (parts.length === 1) {
      return { campaignId: Number(startParam) };
    } else {
      return { campaignId: Number(parts[0]), referrerId: parts[1] };
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  return {
    campaignId: Number(urlParams.get('campaignId')),
    organizationId: Number(urlParams.get('organizationId')),
    referrerId: urlParams.get('referrerId'),
  };
};
