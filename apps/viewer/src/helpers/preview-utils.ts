interface WelcomeScreenCustomization {
  title?: string;
  description?: string;
  buttonText?: string;
  cssVariables?: {
    '--color-primary'?: string;
    '--color-secondary'?: string;
    '--color-background'?: string;
    '--color-text'?: string;
    '--color-text-muted'?: string;
  };
}

interface TabCustomization {
  colors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
}

export interface PreviewCustomization {
  welcomeScreen?: WelcomeScreenCustomization;
  activeQuests?: TabCustomization;
  leaderboard?: TabCustomization;
  library?: TabCustomization;
}

export const getPreviewCustomization = (): PreviewCustomization | null => {
  const urlParams = new URLSearchParams(window.location.search);
  const isPreview = urlParams.get('preview') === 'true';
  const customizationParam = urlParams.get('customization');

  if (!isPreview || !customizationParam) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(customizationParam));
  } catch (error) {
    console.error('Failed to parse preview customization:', error);
    return null;
  }
};

export const isPreviewMode = (): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('preview') === 'true';
};

export const applyPreviewCustomization = (customization: PreviewCustomization) => {
  // Apply CSS variables if provided
  if (customization.welcomeScreen?.cssVariables) {
    const root = document.documentElement;
    Object.entries(customization.welcomeScreen.cssVariables).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(key, value);
      }
    });
  }

  // Apply tab-specific customizations by adding CSS variables
  const applyTabColors = (
    tabName: string,
    colors?: { primary?: string; secondary?: string; background?: string; text?: string },
  ) => {
    if (!colors) return;

    const root = document.documentElement;
    if (colors.primary) {
      root.style.setProperty(`--${tabName}-primary-color`, colors.primary);
    }
    if (colors.secondary) {
      root.style.setProperty(`--${tabName}-secondary-color`, colors.secondary);
    }
    if (colors.background) {
      root.style.setProperty(`--${tabName}-background-color`, colors.background);
    }
    if (colors.text) {
      root.style.setProperty(`--${tabName}-text-color`, colors.text);
    }
  };

  applyTabColors('active-quests', customization.activeQuests?.colors);
  applyTabColors('leaderboard', customization.leaderboard?.colors);
  applyTabColors('library', customization.library?.colors);
};

// Test function to generate preview URL
export const generateTestPreviewUrl = (baseUrl: string = 'http://localhost:5173') => {
  const testCustomization: PreviewCustomization = {
    welcomeScreen: {
      title: 'Custom Preview Title',
      description: 'This is a custom preview description',
      buttonText: "Let's Go!",
      cssVariables: {
        '--color-primary': '#ff6b35',
        '--color-secondary': '#f7931e',
      },
    },
    activeQuests: {
      colors: {
        primary: '#ff6b35',
        text: '#333333',
      },
    },
    leaderboard: {
      colors: {
        primary: '#ff6b35',
        text: '#333333',
      },
    },
  };

  const params = new URLSearchParams();
  params.set('campaignId', '115');
  params.set('preview', 'true');
  params.set('customization', JSON.stringify(testCustomization));

  const url = `${baseUrl}?${params.toString()}`;
  console.log('Test Preview URL:', url);
  return url;
};
