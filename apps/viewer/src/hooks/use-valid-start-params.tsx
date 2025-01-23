import { useState, useEffect } from 'react';

export const useValidStartParams = (campaignId?: string | null, referrerId?: string | null): boolean => {
  const [isValid, setIsValid] = useState<boolean>(false);

  useEffect(() => {
    if (!campaignId && !referrerId) {
      setIsValid(false);
      return;
    }

    if (referrerId && !campaignId) {
      setIsValid(false);
      return;
    }

    const isValidCampaignId = campaignId ? /^\d+$/.test(campaignId) : false;

    const isValidReferrerId = referrerId ? /^[a-fA-F0-9]{64}$/.test(referrerId) : true;

    setIsValid(isValidCampaignId && isValidReferrerId);
  }, [campaignId, referrerId]);

  return isValid;
};
