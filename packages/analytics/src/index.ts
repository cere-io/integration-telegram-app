import { CereAnalytics } from './CereAnalytics.ts';
import {
  CERE_ANALYTICS_APP_ID,
  CERE_ANALYTICS_APP_MNEMONIC,
  CERE_ANALYTICS_DATA_SERVICE_PUBLIC_KEY,
  EVENT_DISPATCH_URL,
  GTM_ID,
} from './constants';
import { GtmAnalytics } from './GtmAnalytics.ts';

export * from './identifiers';

const gtmAnalytics = new GtmAnalytics({
  gtmId: GTM_ID,
  enabled: !!GTM_ID,
});

const cereAnalytics = new CereAnalytics(
  EVENT_DISPATCH_URL,
  CERE_ANALYTICS_APP_ID,
  CERE_ANALYTICS_APP_MNEMONIC,
  CERE_ANALYTICS_DATA_SERVICE_PUBLIC_KEY,
);

const loadGeo = async () => {
  const ipWhoResponse = await fetch('https://ipwho.is/');
  if (ipWhoResponse.status == 200) {
    const { ip, country_code, country, continent_code, continent } = await ipWhoResponse.json();
    cereAnalytics.setGeo({ ip, country_code, country_name: country, continent_code, continent_name: continent });
    return;
  } else {
    cereAnalytics.exception('FAILED_TO_FETCH_GEO', { url: 'https://ipwho.is/' });
  }

  const ipApiResponse = await fetch('https://ipapi.co/json/');
  if (ipApiResponse.status == 200) {
    const { ip, country_code, country_name, continent_code } = await ipApiResponse.json();
    cereAnalytics.setGeo({ ip, country_code, country_name, continent_code });
    return;
  } else {
    cereAnalytics.exception('FAILED_TO_FETCH_GEO', { url: 'https://ipapi.co/json/' });
  }
};

loadGeo();

export { cereAnalytics, gtmAnalytics };
export default cereAnalytics;
