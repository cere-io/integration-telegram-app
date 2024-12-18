import { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft, Play, Trophy, Gift } from 'lucide-react';
import './style.css';

const slides = [
  {
    id: 1,
    icon: Play,
    title: 'Discover Content',
    description: 'Explore a world of captivating videos tailored just for you.',
  },
  {
    id: 2,
    icon: Trophy,
    title: 'Earn Rewards',
    description: 'Complete challenges and climb to the top of our leaderboard.',
  },
  {
    id: 3,
    icon: Gift,
    title: 'Unlock Perks',
    description: 'Redeem your points for exclusive content and amazing prizes.',
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
                  <Icon />
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
