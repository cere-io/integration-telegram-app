import { useState, useEffect } from 'react';

const isValidPolkadotAddress = (address: string): boolean => {
  const polkadotPattern = /^[1-9A-HJ-NP-Za-km-z]{48}$/;
  return polkadotPattern.test(address);
};

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

    const isValidReferrerId = referrerId ? isValidPolkadotAddress(referrerId) : true;

    setIsValid(isValidCampaignId && isValidReferrerId);
  }, [campaignId, referrerId]);

  return isValid;
};
