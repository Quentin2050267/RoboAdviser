import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ProgressBar } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const questions = [
  { id: 1, text: "What is your age?", options: ["A. 18-30", "B. 31-50", "C. 51-64", "D. 65 or above"] },
  { id: 2, text: "What is your income source?", options: ["A. Fixed", "B. Variable", "C. None"] },
  // { id: 3, text: "Annual investment amount?", options: ["A. Below $10,000", "B. $10,000 - $50,000", "C. $50,000 - $200,000", "D. Above $200,000"] },
  // { id: 4, text: "Your next major expenditure?", options: ["A. Buying a house", "B. Paying for a college education", "C. Capitalizing a new business", "D. Providing for retirement"] },
  // { id: 5, text: "Your primary objective for investing?", options: ["A. Ensure asset security with fixed returns", "B. Moderate appreciation with balanced risk", "C. Long-term growth, tolerant of short-term fluctuations", "D. Focus on high long-term returns, ignoring short-term volatility"] },
  // { id: 6, text: "When do you expect to use your investment money?", options: ["A. Any time now (high liquidity needed)", "B. In 2-5 years", "C. In 6-10 years", "D. Beyond 11-20 years"] },
  // { id: 7, text: "Expected annual income change?", options: ["A. Stay the same", "B. Moderate growth", "C. Substantial growth", "D. Moderate decrease", "E. Substantial decrease"] },
  // { id: 8, text: "Your level of financial knowledge?", options: ["A. Lack basic investment knowledge", "B. Some understanding but no investment skills", "C. Fair understanding with some investment techniques", "D. Thorough understanding with advanced techniques"] },
  // { id: 9, text: "Years of experience investing in risk assets?", options: ["A. None", "B. Under 2 years", "C. 2-5 years", "D. 5-8 years", "E. Over 8 years"] },
  // { id: 10, text: "How do you perceive investment losses?", options: ["A. Very difficult to accept", "B. Some impact but manageable", "C. Neutral mindset, little emotional effect", "D. Completely normal, accepts risks"] },
  // { id: 11, text: "Response after a 14% investment loss due to market correction?", options: ["A. Sell to avoid further decline", "B. Hold and wait for recovery", "C. Buy more at a lower price"] },
  // { id: 12, text: "Maximum acceptable loss percentage?", options: ["A. Within 10%", "B. 10% - 30%", "C. 30% - 50%", "D. Over 50%"] },
  // { id: 13, text: "Expected investment return rate?", options: ["A. Higher than fixed deposit rate", "B. ~10%, low risk", "C. 10-20%, moderate risk", "D. Over 20%, high risk"] },
  // { id: 14, text: "Investing plan for your portfolio?", options: ["A. Diversify across all risk levels", "B. Moderate risk, high returns", "C. High-risk, highest returns"] },
  // { id: 15, text: "Preferred stock investment type?", options: ["A. High-growth potential, low price", "B. Established growth companies", "C. Blue-chip dividend stocks"] },
  // { id: 16, text: "Preferred bond investment type?", options: ["A. High-yield (junk) bond", "B. Established company bond", "C. Tax-free bond"] },
  // { id: 17, text: "Response to inflation advice with long-term bonds?", options: ["A. Ignore advice", "B. Partial shift to hard assets", "C. Full shift to hard assets", "D. Over-invest in hard assets"] },
  // { id: 18, text: "Game show decision with $10,000 winnings?", options: ["A. Take the money", "B. 50% chance at $50k", "C. 20% chance at $75k", "D. 5% chance at $100k"] }
];

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
  const navigate = useNavigate();

  const handleAnswer = (index) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = questions[currentQuestion].options[index]; // 选中
    setAnswers(newAnswers);
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
      alert("请回答所有问题后再提交。");
      return;
    }

    const confirmed = window.confirm("确认提交吗？");
    if (confirmed) {
      console.log('Answers:', answers);

      fetch('/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
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