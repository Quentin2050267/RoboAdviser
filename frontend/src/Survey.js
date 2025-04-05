import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ProgressBar } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { questions } from './questionnaire';


const PageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #e6f7ff;
`;

const SurveyContainer = styled.div`
  position: relative;
  background-color: #ffffff;
  border-radius: 15px;
  padding: 0;
  width: 600px;
  height: 500px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  background-color: #33475b; /* 略微灰的深蓝色 */
  color: #ffffff;
  padding: 10px;
  border-radius: 15px 15px 0 0;
  margin: 0;
  text-align: center;
`;

const StyledProgressBar = styled(ProgressBar)`
  height: 8px; /* 使进度条更窄 */
  border-radius: 0 0 0 0 !important;
  .progress-bar {
    background-color: #28a745 !important; /* 绿色 */
    border-radius: 0 0 0 0 !important;
  }
`;

const Question = styled.h2`
  padding-top: 30px;
  padding-left: 30px; 
  padding-right: 30px;
  margin-bottom: 20px;
  font-size: 18px;
  margin-top: 0;
`;

const Options = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 30px;
`;

const OptionContainer = styled.div`
  display: flex;
  align-items: center;
  margin: 5px 0; /* 减小选项之间的间隙 */
  padding: 10px 20px; /* 增加左右的间隙 */
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
`;

const RadioButton = styled.input.attrs({ type: 'radio' })`
  margin-right: 10px;
  border-radius: 50%;
  cursor: pointer;
`;

const NavigationButton = styled.button`
  width: 110px;
  height: 40px;
  margin: 20px;
  // padding: 10px 10px;
  cursor: pointer;
  border: 1px solid #bbb;
  border-radius: 5px;
  background-color: #f8f9fa;
  transition: background-color 0.3s, border-color 0.3s;

  &:hover {
    background-color: #e2e6ea;
    border-color: #aaa;
  }
`;

const ButtonContainer = styled.div`
  position: absolute;
  bottom: 20px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 0 20px;
`;

function Survey() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState(Array(questions.length).fill(null));
  const [weights, setWeights] = useState(Array(questions.length).fill(1));
  const navigate = useNavigate();

  const handleAnswer = (index) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = questions[currentQuestion].options[index]; // 选中
    setAnswers(newAnswers);

    const newWeights = [...weights];
    newWeights[currentQuestion] = questions[currentQuestion].weight
      ? questions[currentQuestion].weight
      : 1;
    setWeights(newWeights);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    if (answers.includes(null)) {
      alert("Please answer all questions before submitting.");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to submit your answers?");
    if (confirmed) {
      console.log('Answers:', answers);
      console.log('Weights:', weights);

      fetch('/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers, weights }),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log('Success:', data);
          navigate('/report', { state: { report: data.report } });
        })
        .catch((error) => {
          console.error('Error:', error);
        });
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <PageContainer>
      <SurveyContainer>
        <Title>Survey</Title>
        <StyledProgressBar now={progress} />
        {currentQuestion < questions.length ? (
          <div>
            <Question>
              {currentQuestion + 1}. {questions[currentQuestion].text}
            </Question>
            <Options>
              {questions[currentQuestion].options.map((option, index) => (
                <OptionContainer
                  key={index}
                  selected={answers[currentQuestion] === option}
                  onClick={() => handleAnswer(index)}
                >
                  <RadioButton
                    name={`question-${currentQuestion}`}
                    checked={answers[currentQuestion] === option}
                    readOnly
                  />
                  {option}
                </OptionContainer>
              ))}
            </Options>
            <ButtonContainer>
              <NavigationButton onClick={handlePrev} disabled={currentQuestion === 0}>
                Previous
              </NavigationButton>
              {currentQuestion < questions.length - 1 ? (
                <NavigationButton onClick={handleNext}>
                  Next
                </NavigationButton>
              ) : (
                <NavigationButton onClick={handleSubmit}>
                  Submit
                </NavigationButton>
              )}
            </ButtonContainer>
          </div>
        ) : (
          <div>
            <h2>Thank you for your responses!</h2>
            <ButtonContainer>
              <NavigationButton onClick={handlePrev}>
                Previous
              </NavigationButton>
              <NavigationButton onClick={handleSubmit}>
                Submit
              </NavigationButton>
            </ButtonContainer>
          </div>
        )}
      </SurveyContainer>
    </PageContainer>
  );
}

export default Survey;