import { Checkbox, Text, Button } from '@tg-app/ui';
import './style.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards, Pagination, Navigation } from 'swiper/modules';
import EarnRewards from './icons/EarnRewards.svg';
import ExpertInsights from './icons/ExpertInsights.svg';
import AINLP from './icons/AINLP.svg';

import 'swiper/css';
import 'swiper/css/effect-cards';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

type WelcomeScreenProps = {
  onStart?: () => void;
};

export const WelcomeScreen = ({ onStart }: WelcomeScreenProps) => {
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [tempPrivacyAccepted, setTempPrivacyAccepted] = useState(false);

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
          <span>Start Earning</span>
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
  }, [tempPrivacyAccepted, handleButtonClick]);

  return (
    <div className="container">
      <div className="content-wrapper">
        <div className="top-container">
          <div className="ellipse-top"></div>
          <div className="ellipse-bottom"></div>
          <div className="hero-wrapper">
            <h1 className="hero-title">Sit back, Enjoy, and Earn!</h1>
            <p className="hero-description">
              Watch exclusive project explainers for unique insights and get rewarded in top-project tokens!
            </p>
          </div>

          <Swiper
            effect={'cards'}
            grabCursor={true}
            modules={[EffectCards, Pagination, Navigation]}
            className="hero-slider-wrapper"
          >
            <SwiperSlide>
              <div className="slider-icon">
                <img src={EarnRewards} alt="Earn Rewards" />
              </div>
              <div className="slider-content">
                <h3>Earn Rewards</h3>
                <p>Complete challenges and climb to the top of our leaderboard</p>
              </div>
            </SwiperSlide>
            <SwiperSlide>
              <div className="slider-icon">
                <img src={ExpertInsights} alt="Expert Insights" />
              </div>
              <div className="slider-content">
                <h3>Expert Insights</h3>
                <p>Get insights on top projects with expert-created explainers</p>
              </div>
            </SwiperSlide>
            <SwiperSlide>
              <div className="slider-icon">
                <img src={AINLP} alt="AI NLP" />
              </div>
              <div className="slider-content">
                <h3>AI NLP</h3>
                <p>Intelligent rewards for positive community engagement</p>
              </div>
            </SwiperSlide>
          </Swiper>
        </div>
        <div className="bottom-container">
          {!privacyAccepted && (
            <div className="checkbox-container">
              <Checkbox checked={tempPrivacyAccepted} onChange={handleCheckboxChange} title="Title" color="white" />
              <p className="privacy-text">
                I agree to Cere Media's data processing for personalized content and rewards.
              </p>
            </div>
          )}
          {renderButton}
          <a
            href="https://docs.google.com/document/d/1Sw-FjsNu_uS4t5wIyb8Cam0l8t8WFaAa1VHWMQkIHjs/edit?tab=t.0#heading=h.c6pbbfrgmg51"
            className="privacy-link"
          >
            Read full privacy policy
          </a>
        </div>
      </div>
    </div>
  );
};
