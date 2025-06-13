import './style.css';
import 'swiper/css';
import 'swiper/css/effect-cards';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

import { FormDataType } from '@tg-app/rms-service';
import { Button, Checkbox, Text } from '@tg-app/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EffectCards, Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import { useData } from '~/providers';

import { getPreviewCustomization } from '../../helpers';
import AINLP from './icons/AINLP.svg';
import EarnRewards from './icons/EarnRewards.svg';
import ExpertInsights from './icons/ExpertInsights.svg';

type WelcomeScreenProps = {
  onStart?: () => void;
};

export const WelcomeScreen = ({ onStart }: WelcomeScreenProps) => {
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [tempPrivacyAccepted, setTempPrivacyAccepted] = useState(false);
  const [config, setConfig] = useState<FormDataType['campaign']['configuration']['welcomeScreen'] | null>(null);

  const { campaignConfig, campaignConfigLoaded } = useData();

  // Get preview customization if available
  const previewCustomization = getPreviewCustomization();

  useEffect(() => {
    if (!campaignConfig) return;
    const formData = JSON.parse((campaignConfig?.formData as unknown as string) || '');
    if (
      formData.campaign?.configuration &&
      Object.prototype.hasOwnProperty.call(formData.campaign?.configuration, 'welcomeScreen')
    ) {
      setConfig(formData.campaign.configuration.welcomeScreen || {});
    }
  }, [campaignConfig]);

  useEffect(() => {
    // Apply CSS variables from preview customization or config
    const cssVariables = previewCustomization?.welcomeScreen?.cssVariables || config?.cssVariables;
    if (cssVariables) {
      Object.entries(cssVariables).forEach(([key, value]) => {
        if (value) {
          document.documentElement.style.setProperty(key, value);
        }
      });
    }
  }, [config?.cssVariables, previewCustomization?.welcomeScreen?.cssVariables]);

  useEffect(() => {
    const savedPrivacyAccepted = localStorage.getItem('privacyAccepted') === 'true';
    setPrivacyAccepted(savedPrivacyAccepted);
    setTempPrivacyAccepted(savedPrivacyAccepted);
  }, []);

  const handleCheckboxChange = useCallback(() => {
    setTempPrivacyAccepted((prev) => !prev);
  }, []);

  const handleButtonClick = useCallback(() => {
    if (onStart) {
      onStart();
    }
    setPrivacyAccepted(tempPrivacyAccepted);
    if (tempPrivacyAccepted) {
      localStorage.setItem('privacyAccepted', 'true');
    } else {
      localStorage.removeItem('privacyAccepted');
    }
  }, [onStart, tempPrivacyAccepted]);

  const renderButton = useMemo(() => {
    const isButtonDisabled = !tempPrivacyAccepted;

    return (
      <Button
        size="l"
        mode="cta"
        disabled={isButtonDisabled}
        onClick={handleButtonClick}
        className="welcome-cta-button"
      >
        <Text className="welcom-cta-text">
          <span>{previewCustomization?.welcomeScreen?.buttonText || config?.buttonText || 'Start Earning'}</span>
          <svg width="15" height="14" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M14.1178 5.18713L8.93455 -6.10352e-05L7.55176 1.38567L12.735 6.57286L7.55176 11.7601L8.93847 13.1458L14.1178 7.9586C14.4853 7.59104 14.6917 7.09259 14.6917 6.57286C14.6917 6.05314 14.4853 5.55469 14.1178 5.18713Z"
              fill="white"
            />
            <path
              d="M7.26285 5.88L1.38279 -6.10352e-05L0 1.38567L5.18327 6.57286L0 11.7601L1.38671 13.1458L7.26677 7.26573C7.44998 7.08143 7.55248 6.83192 7.55175 6.57205C7.55101 6.31219 7.4471 6.06326 7.26285 5.88Z"
              fill="white"
            />
          </svg>
        </Text>
      </Button>
    );
  }, [tempPrivacyAccepted, handleButtonClick, config?.buttonText, previewCustomization?.welcomeScreen?.buttonText]);

  const slidesToRender = useMemo(() => {
    const defaultSlides = [
      {
        icon: EarnRewards,
        title: 'Earn Rewards',
        description: 'Complete challenges and climb to the top of our leaderboard',
      },
      {
        icon: ExpertInsights,
        title: 'Expert Insights',
        description: 'Get insights on top projects with expert-created explainers',
      },
      {
        icon: AINLP,
        title: 'AI NLP',
        description: 'Intelligent rewards for positive community engagement',
      },
    ];

    if (config?.sliderContent && config.sliderContent.length > 0) {
      return defaultSlides.map((slide, index) => {
        const updatedSlide = config.sliderContent?.[index];
        if (updatedSlide) {
          return {
            ...slide,
            icon: updatedSlide.icon || slide.icon,
            title: updatedSlide.title || slide.title,
            description: updatedSlide.description || slide.description,
          };
        }
        return slide;
      });
    }

    return defaultSlides;
  }, [config?.sliderContent]);

  if (!campaignConfigLoaded) {
    return null;
  }

  return (
    <div className="container">
      <div className="content-wrapper">
        <div className="top-container">
          <div className="ellipse-top"></div>
          <div className="ellipse-bottom"></div>
          <div className="hero-wrapper">
            <h1 className="hero-title">
              {previewCustomization?.welcomeScreen?.title || config?.title || 'Sit back, Enjoy, and Earn!'}
            </h1>
            <p className="hero-description">
              {previewCustomization?.welcomeScreen?.description ||
                config?.description ||
                'Watch exclusive project explainers for unique insights and get rewarded in top-project tokens!'}
            </p>
          </div>

          {!privacyAccepted && (
            <div className="checkbox-container">
              <Checkbox checked={tempPrivacyAccepted} onChange={handleCheckboxChange} title="Title" color="white" />
              <p className="privacy-text">
                {config?.agreementText ||
                  "I agree to Cere Media's data processing for personalized content and rewards."}
              </p>
            </div>
          )}
          {renderButton}
          <a href={config?.privacyLink || 'https://www.cere.network/privacy-policy'} className="privacy-link">
            {config?.privacyText || 'Read full privacy policy'}
          </a>
        </div>
        <div className="bottom-container">
          <Swiper
            effect={'cards'}
            grabCursor={true}
            modules={[EffectCards, Pagination, Navigation]}
            className="hero-slider-wrapper"
          >
            {slidesToRender.map((slide, index) => (
              <SwiperSlide key={index}>
                <div className="slider-icon">
                  <img src={slide.icon} alt={slide.title} />
                </div>
                <div className="slider-content">
                  <h3>{slide.title}</h3>
                  <p>{slide.description}</p>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  );
};
