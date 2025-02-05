import { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import rewardsIcon from '../../icons/7265170.png';
import expertInsights from '../../icons/Expert-Insights-Icon.webp';
import nlp from '../../icons/nlp-natural-language-processing.png';
import './style.css';

const slides = [
  {
    id: 1,
    icon: rewardsIcon,
    title: 'Earn Rewards',
    description: 'Complete challenges and climb to the top of our leaderboard.',
  },
  {
    id: 2,
    icon: expertInsights,
    title: 'Exclusive Expert Insights',
    description: 'Get insider knowledge on the hottest projects and tech through expert-created explainers.',
  },
  {
    id: 3,
    icon: nlp,
    title: 'Coming soon: AI NLP',
    description: 'Intelligent rewards for positive community engagement and participation',
  },
];

export const Slider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="slider-container">
      <button className="arrow left" onClick={prevSlide}>
        <ChevronLeft />
      </button>

      <div className="slides">
        {slides.map((slide, index) => {
          const Icon = slide.icon;
          return (
            <div
              key={slide.id}
              className={`slide ${currentSlide === index ? 'active' : ''}`}
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              <div className="content" style={{ padding: '10px' }}>
                <span className="icon">
                  <img style={{ width: '30px', height: '30px' }} src={Icon} alt="" />
                </span>
                {slide.title}
                <p className="description">{slide.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <button className="arrow right" onClick={nextSlide}>
        <ChevronRight />
      </button>

      <div className="indicators">
        {slides.map((_, index) => (
          <div key={index} className={`indicator ${currentSlide === index ? 'active' : ''}`} />
        ))}
      </div>
    </div>
  );
};
