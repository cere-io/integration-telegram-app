import './QuizQuest.css';

import { ActivityEvent } from '@cere-activity-sdk/events';
import { useEvents, useStartParam } from '@integration-telegram-app/viewer/src/hooks';
import { useData } from '@integration-telegram-app/viewer/src/providers';
import { QuizTask } from '@integration-telegram-app/viewer/src/types';
import { Text, Title } from '@telegram-apps/telegram-ui';
import confetti from 'canvas-confetti';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { ProgressBar, ProgressFill } from '../ProgressBar';

type QuizQuestProps = {
  quizTask: QuizTask;
  isDisabled?: boolean;
};

export const QuizQuest = ({ quizTask, isDisabled }: QuizQuestProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(() => {
    if (quizTask.lastAnsweredQuestion !== 0 || quizTask.completed) {
      return 0;
    }
    return +quizTask.lastAnsweredQuestion + 1;
  });
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<{ id: string; text: string }[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);

  const eventSource = useEvents();
  const { activeCampaignId } = useData();
  const { organizationId, campaignId } = useStartParam();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
  };

  const handleClick = useCallback(() => {
    if (!eventSource) return;

    const { event_type, timestamp, data } = {
      event_type: 'QUESTION_ANSWERED',
      timestamp: new Date().toISOString(),
      data: JSON.stringify({
        campaign_id: campaignId || activeCampaignId,
        organization_id: organizationId,
        quizId: quizTask.id,
        questionId: quizTask.questions[currentQuestion].id,
        answerId: selectedOption,
      }),
    };
    const parsedData = JSON.parse(data);

    const activityEvent = new ActivityEvent(event_type, {
      ...parsedData,
      timestamp,
    });

    setTimeout(() => void eventSource.dispatchEvent(activityEvent), 1000);

    if (currentQuestion === quizTask.questions.length - 1) {
      setQuizFinished(true);
    } else {
      setCurrentQuestion((prevState) => prevState + 1);
    }

    if (selectedOption !== null) {
      const currentAnswer = quizTask.questions[currentQuestion].options.find((q) => q.id === selectedOption);
      if (!currentAnswer) return;
      setUserAnswers((prevAnswers) => [
        ...prevAnswers,
        {
          id: currentAnswer?.id,
          text: currentAnswer?.text,
        },
      ]);
      setSelectedOption(null);
    }
  }, [campaignId, currentQuestion, eventSource, quizTask.id, quizTask.questions, selectedOption]);

  const totalPoints = quizTask.questions.reduce((prev, next) => +prev + parseInt(String(next.points), 10), 0);

  const progress = (currentQuestion / quizTask.questions.length) * 100;

  const userScore = userAnswers.reduce((score, answer, index) => {
    const points = quizTask.questions[index].points;
    const currentAnswer = quizTask.questions[index].options.find((option) => option.id === answer.id);
    if (currentAnswer?.isCorrect) {
      return score + parseInt(String(points), 10);
    }
    return score;
  }, 0);

  const correctAnswers = useMemo(
    () =>
      quizTask.questions.reduce(
        (prev, next) => {
          const correctOption = next.options.find((s) => Boolean(s.isCorrect));
          if (correctOption) {
            prev.push({ id: correctOption?.id, text: correctOption?.text });
          }
          return prev;
        },
        [] as { id: string; text: string }[],
      ),
    [quizTask.questions],
  );

  useEffect(() => {
    if (quizFinished) {
      if (userScore > 0) {
        confetti({
          particleCount: userScore * 3,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  }, [quizFinished, userScore]);

  const renderIcon = (isAnswerCorrect: boolean) => {
    return (
      <div>
        {isAnswerCorrect ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            color="rgb(34 197 94)"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            color="rgb(239 68 68)"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="m15 9-6 6"></path>
            <path d="m9 9 6 6"></path>
          </svg>
        )}
      </div>
    );
  };

  if (quizFinished) {
    const allCorrect = userScore === totalPoints;
    return (
      <div
        className={`questContainer ${allCorrect ? 'allCorrect' : ''}`}
        style={{ background: allCorrect ? 'linear-gradient(to right, #a855f7, #ec4899, #ef4444)' : '' }}
      >
        <div style={{ marginBottom: '16px' }}>
          <Title level="2" weight="2" style={{ ...(allCorrect && { color: '#fff' }) }}>
            Quiz Results
          </Title>
          <Title
            level="1"
            weight="2"
            style={{ ...(allCorrect && { color: '#fff' }), textAlign: 'center' }}
            className={allCorrect ? 'bounceAnimation' : ''}
          >
            {userScore > 0 ? `🎉 ${userScore} Points Earned! 🎉` : 'No points earned'}
          </Title>
          <Text
            Component="div"
            color="textSecondary"
            style={{ ...(allCorrect && { color: '#fff' }), textAlign: 'center' }}
          >
            {userScore > 0
              ? `Great job! You earned ${userScore} out of ${totalPoints} possible points.`
              : 'Try again with next quiz'}
          </Text>
        </div>
        {userAnswers.map((answer, index) => {
          const isAnswerCorrect = correctAnswers[index].id === answer.id;
          return (
            <div key={index} className={`optionContainer ${allCorrect ? 'allCorrect' : ''}`}>
              <div
                className={`option ${allCorrect ? 'allCorrect' : ''}`}
                style={{ flexDirection: 'column', alignItems: 'start' }}
              >
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text style={{ ...(allCorrect && { color: '#fff' }) }}>{quizTask.questions[index].title}</Text>
                    <Text style={{ ...(allCorrect && { color: '#fff' }) }}>
                      Your answer:{' '}
                      <Text as="span" style={{ color: isAnswerCorrect ? 'rgb(34 197 94)' : 'rgb(239 68 68)' }}>
                        {answer.text}
                      </Text>
                    </Text>
                    {!isAnswerCorrect && (
                      <Text>
                        Correct answer: <Text as="span">{correctAnswers[index].text}</Text>
                      </Text>
                    )}
                  </div>
                  <div>{renderIcon(isAnswerCorrect)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="questContainer">
      <div className="questHeader">
        <Title style={{ fontWeight: 600, fontSize: '1.5rem' }}>{quizTask.title}</Title>
        <Text style={{ textAlign: 'right', color: 'rgb(249 115 22)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          {totalPoints} Pts
        </Text>
      </div>
      <ProgressBar height="8px" borderRadius="9999px">
        <ProgressFill value={progress} fillColor="#000000" borderRadius="9999px" />
      </ProgressBar>
      <div style={{ marginTop: '6px' }} />
      <Text as="div" style={{ color: '#6b7280' }}>
        Question {currentQuestion + 1} of {quizTask.questions.length}
      </Text>
      <Title level="3" weight="1" className="questionHeader" style={{ marginTop: '16px', marginBottom: '16px' }}>
        {quizTask.questions[currentQuestion].title}
      </Title>
      <div className="optionContainer">
        {quizTask.questions[currentQuestion].options.map((optionItem) => (
          <label key={optionItem.id} className="option">
            <input
              type="radio"
              name="quiz"
              value={optionItem.id}
              checked={selectedOption === optionItem.id}
              onChange={handleChange}
              className="radioInput"
            />
            <div className={`customRadio ${selectedOption === optionItem.id ? 'checked' : ''}`} />
            <Text>{optionItem.text}</Text>
          </label>
        ))}
      </div>
      <button className="button" onClick={handleClick} disabled={selectedOption === null || isDisabled}>
        {currentQuestion === quizTask.questions.length - 1 ? 'Submit Quest' : 'Next Question'}
      </button>
    </div>
  );
};
