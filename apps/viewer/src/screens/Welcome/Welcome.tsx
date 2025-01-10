import { Checkbox, Text, Button } from '@tg-app/ui';
import './style.css';
import { Slider } from './components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';

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
        stretched
        size="l"
        mode="cta"
        disabled={isButtonDisabled}
        onClick={handleButtonClick}
        className="cta-button"
      >
        <Text className="cta-text">
          Start Earning
          <ChevronRight />
        </Text>
      </Button>
    );
  }, [tempPrivacyAccepted, handleButtonClick]);

  return (
    <div className="container">
      <div className="content-wrapper">
        <div className="top-container">
          <h1 className="cere-title" style={{ marginBottom: '60px' }}>
            Sit back, Enjoy, and Earn!
          </h1>
          <p className="description" style={{ textAlign: 'center' }}>
            Watch exclusive project explainers for unique insights and get rewarded in top-project tokens!
          </p>
          <Slider />
        </div>
        <div className="bottom-container">
          {!privacyAccepted && (
            <div className="checkbox-container">
              <Checkbox checked={tempPrivacyAccepted} onChange={handleCheckboxChange} title="Title" color="white" />
              <Text className="privacy-text">
                I agree to Cere Media's data processing for personalized content and rewards.
                <a href="https://www.cere.network/privacy-policy" className="privacy-link">
                  Read full privacy policy
                </a>
              </Text>
            </div>
          )}
          <div className="cta-button-container">{renderButton}</div>
        </div>
      </div>
    </div>
  );
};
