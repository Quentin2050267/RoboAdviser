import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import './App.css';

const questions = [
  { question: "你喜欢什么颜色？", options: ["红色", "蓝色", "绿色", "黄色"] },
  { question: "你喜欢什么动物？", options: ["猫", "狗", "鸟", "鱼"] },
  { question: "你喜欢什么季节？", options: ["春天", "夏天", "秋天", "冬天"] },
  // 添加更多问题
];

const Container = styled.div`
  text-align: center;
  margin-top: 50px;
`;

const Question = styled.h2`
  margin-bottom: 20px;
`;

const QuestionNumber = styled.div`
  margin-bottom: 10px;
  font-size: 16px;
  color: #666;
`;

const Options = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const OptionContainer = styled.div`
  display: flex;
  align-items: center;
  margin: 10px;
  padding: 10px 20px;
  border: 1px solid #ccc;
  background-color: ${props => (props.selected ? '#cce5ff' : '#fff')};
  color: ${props => (props.selected ? '#004085' : '#000')};
  cursor: pointer;
  width: 200px;
  transition: background-color 0.3s, color 0.3s;

  &:hover {
    background-color: #cce5ff;
    color: #004085;
  }
`;

const Checkbox = styled.input`
  margin-right: 10px;
`;

const NavigationButton = styled.button`
  margin: 20px;
  padding: 10px 20px;
  cursor: pointer;
`;

const optionLabels = ['A', 'B', 'C', 'D'];

function Survey() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState(Array(questions.length).fill(null));
  const navigate = useNavigate();

  const handleAnswer = (index) => {
    const newAnswers = [...answers];
    if (newAnswers[currentQuestion] === optionLabels[index]) {
      newAnswers[currentQuestion] = null; // 取消选中
    } else {
      newAnswers[currentQuestion] = optionLabels[index]; // 选中
    }
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

  return (
    <Container>
      <h1>问卷调查</h1>
      {currentQuestion < questions.length ? (
        <div>
          <QuestionNumber>
            问题 {currentQuestion + 1} / {questions.length}
          </QuestionNumber>
          <Question>{questions[currentQuestion].question}</Question>
          <Options>
            {questions[currentQuestion].options.map((option, index) => (
              <OptionContainer
                key={index}
                selected={answers[currentQuestion] === optionLabels[index]}
                onClick={() => handleAnswer(index)}
              >
                <Checkbox
                  type="checkbox"
                  checked={answers[currentQuestion] === optionLabels[index]}
                  readOnly
                />
                {`${optionLabels[index]}. ${option}`}
              </OptionContainer>
            ))}
          </Options>
          <div>
            <NavigationButton onClick={handlePrev} disabled={currentQuestion === 0}>
              上一页
            </NavigationButton>
            {currentQuestion < questions.length - 1 ? (
              <NavigationButton onClick={handleNext}>
                下一页
              </NavigationButton>
            ) : (
              <NavigationButton onClick={handleSubmit}>
                提交
              </NavigationButton>
            )}
          </div>
        </div>
      ) : (
        <div>
          <h2>感谢你的回答！</h2>
          <NavigationButton onClick={handlePrev}>
            上一页
          </NavigationButton>
          <NavigationButton onClick={handleSubmit}>
            提交
          </NavigationButton>
        </div>
      )}
    </Container>
  );
}

export default Survey;