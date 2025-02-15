import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  text-align: center;
  margin-top: 50px;
`;

const Button = styled.button`
  margin-top: 20px;
  padding: 10px 20px;
  cursor: pointer;
`;

function Report() {
  const location = useLocation();
  const navigate = useNavigate();
  const { report } = location.state || { report: null };

  const handleRetry = () => {
    navigate('/');
  };

  return (
    <Container>
      <h1>感谢您的回答！</h1>
      <p>以下是你的分析报告：</p>
      {report ? (
        <pre>{JSON.stringify(report, null, 2)}</pre>
      ) : (
        <p>没有可显示的报告。</p>
      )}
      <Button onClick={handleRetry}>再做一次</Button>
    </Container>
  );
}

export default Report;