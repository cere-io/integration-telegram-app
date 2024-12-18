import { CereIcon, Checkbox, Text, Button, Spinner } from '@tg-app/ui';
import './style.css';
import { Slider } from './components';
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useCereWallet } from '../../cere-wallet';

type WelcomeScreenProps = {
  onStart?: () => void;
};

export const WelcomeScreen = ({ onStart }: WelcomeScreenProps) => {
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isNewWallet, setIsNewWallet] = useState<boolean | null>(null);
  const [isWalletReady, setIsWalletReady] = useState(false);
  const wallet = useCereWallet();

  useEffect(() => {
    const initializeWallet = async () => {
      try {
        await wallet.isReady;
        setIsWalletReady(true);

        const userInfo = await wallet.getUserInfo();
        setIsNewWallet(userInfo.isNewWallet);
        if (!userInfo.isNewWallet) {
          setPrivacyAccepted(true);
        }
      } catch (error) {
        console.error('Wallet initialization error:', error);
      }
    };
    initializeWallet();
  }, [wallet]);

  const handleCheckboxChange = () => {
    setPrivacyAccepted((prevState) => !prevState);
  };

  const renderButton = useMemo(() => {
    const isButtonDisabled = (isNewWallet ?? false) && !privacyAccepted;

    return (
      <Button
        stretched
        size="l"
        mode="cta"
        disabled={!isWalletReady || isButtonDisabled}
        onClick={onStart}
        className="cta-button"
      >
        <Text className="cta-text">
          Start Exploring
          {isWalletReady ? <ChevronRight /> : <Spinner size="s" color="white" />}
        </Text>
      </Button>
    );
  }, [isWalletReady, isNewWallet, onStart, privacyAccepted]);

  return (
    <div className="container">
      <div className="content-wrapper">
        <div className="top-container">
          <CereIcon />
          <h1 className="cere-title">Cere Media</h1>
          <p className="description">Your entertainment journey begins</p>
          <Slider />
        </div>
        <div className="bottom-container">
          {isNewWallet && (
            <div className="checkbox-container">
              <Checkbox checked={privacyAccepted} onChange={handleCheckboxChange} title="Title" />
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
