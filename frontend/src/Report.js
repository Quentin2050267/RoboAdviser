import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Alert } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
// 导入图表库
import {
  LineChart, Line, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart,
  ReferenceDot, Label
} from 'recharts';

const PageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #e6f7ff;
  padding: 20px;
`;

const Container = styled.div`
  text-align: center;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  padding: 20px;
  background-color: #ffffff;
  border-radius: 15px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
`;

const Button = styled.button`
  margin-top: 20px;
  padding: 10px 20px;
  cursor: pointer;
  background-color: #33475b;
  color: white;
  border: none;
  border-radius: 5px;
  transition: background-color 0.3s;

  &:hover {
    background-color: #2c3e50;
  }
`;

const ReportContainer = styled.div`
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  margin-top: 20px;
  text-align: left;
`;

const ChartContainer = styled.div`
  width: 100%;
  height: 400px;
  margin-top: 30px;
  margin-bottom: 20px;
`;

function Report() {
  const location = useLocation();
  const navigate = useNavigate();
  const { success, report, message, error } = location.state || {
    success: undefined,
    report: null,
    message: '',
    error: ''
  };

  // 存储图表数据的状态
  const [chartData, setChartData] = useState({
    efficientFrontierNoShort: [],
    efficientFrontierShort: [],
    funds: [],
    gmvpNoShort: null,
    gmvpShort: null,
    optimalPortNoShort: null,
    optimalPortShort: null
  });

  const [isLoading, setIsLoading] = useState(true);
  // 添加状态来存储坐标轴范围
  const [axisDomain, setAxisDomain] = useState({
    x: ['auto', 'auto'],
    y: ['auto', 'auto']
  });

  // 加载图表数据
  useEffect(() => {
    // 从后端获取数据
    fetch('/api/efficient-frontier')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load chart data');
        }
        return response.json();
      })
      .then(data => {
        // 转换数据为图表可用格式并对数据进行排序处理

        // 1. 先转换数据为可处理格式
        const noShortPoints = data.efficient_frontier_no_short.map(point => ({
          risk: parseFloat((point.risk * 100).toFixed(4)),
          return: parseFloat((point.return * 100).toFixed(4))
        }));

        const shortPoints = data.efficient_frontier_short.map(point => ({
          risk: parseFloat((point.risk * 100).toFixed(4)),
          return: parseFloat((point.return * 100).toFixed(4))
        }));

        const optimalPortNoShort = data.optimal_portfolio && data.optimal_portfolio.find(p => p.name === "No Short");
        const optimalPortShort = data.optimal_portfolio && data.optimal_portfolio.find(p => p.name === "Short");
        const formattedOptimalPortNoShort = optimalPortNoShort ? {
          name: "Optimal Portfolio (No Short)",
          risk: parseFloat((optimalPortNoShort.risk * 100).toFixed(4)),
          return: parseFloat((optimalPortNoShort.return * 100).toFixed(4))
        } : null;

        const formattedOptimalPortShort = optimalPortShort ? {
          name: "Optimal Portfolio (Short)",
          risk: parseFloat((optimalPortShort.risk * 100).toFixed(4)),
          return: parseFloat((optimalPortShort.return * 100).toFixed(4))
        } : null;

        console.log('No Short Points:', noShortPoints.length);
        console.log('Short Points:', shortPoints.length);
        console.log('Optimal Portfolio No Short:', formattedOptimalPortNoShort);
        console.log('Optimal Portfolio Short:', formattedOptimalPortShort);


        // 2. 创建完整有效前沿函数
        const createFullFrontier = (points) => {
          console.log('原始点数量:', points.length);

          // 按风险排序
          const sortedPoints = [...points].sort((a, b) => a.risk - b.risk);

          // 1. 首先找到全局最小方差点（GMVP）
          // 先假设第一个点是GMVP
          let gmvpPoint = sortedPoints[0];

          // 遍历所有点，找到风险最小的点作为GMVP
          for (let i = 1; i < sortedPoints.length; i++) {
            if (sortedPoints[i].risk < gmvpPoint.risk) {
              gmvpPoint = sortedPoints[i];
            }
          }

          console.log('GMVP点:', gmvpPoint);

          // 2. 根据GMVP将所有点分为上半部分和下半部分
          // 上半部分：风险比GMVP大且收益比GMVP大的点
          const upperPart = sortedPoints.filter(
            point => point.risk > gmvpPoint.risk && point.return > gmvpPoint.return
          );

          // 下半部分：风险比GMVP小或风险比GMVP大但收益比GMVP小的点
          const lowerPart = sortedPoints.filter(
            point => (point.risk < gmvpPoint.risk) ||
              (point.risk > gmvpPoint.risk && point.return < gmvpPoint.return)
          );

          console.log('上半部分点数量:', upperPart.length);
          console.log('下半部分点数量:', lowerPart.length);

          // 3. 处理上半部分 - 确保收益随风险增加而增加
          // 按风险从小到大排序
          upperPart.sort((a, b) => a.risk - b.risk);

          // 保留有效前沿上的点（风险增加，收益递增）
          const efficientUpper = [];
          let maxReturn = gmvpPoint.return;

          for (const point of upperPart) {
            if (point.return >= maxReturn) {
              efficientUpper.push(point);
              maxReturn = point.return;
            }
          }

          console.log('有效上半部分点数量:', efficientUpper.length);

          // 4. 处理下半部分 - 确保收益随风险减少而增加
          // 按风险从大到小排序
          lowerPart.sort((a, b) => b.risk - a.risk);

          // 保留有效前沿的点（风险减少，收益递增）
          const efficientLower = [];
          maxReturn = gmvpPoint.return;

          for (const point of lowerPart) {
            if (point.return >= maxReturn) {
              efficientLower.push(point);
              maxReturn = point.return;
            }
          }

          // 将下半部分反转，使其按风险从小到大排序
          efficientLower.reverse();

          console.log('有效下半部分点数量:', efficientLower.length);

          // 5. 合并上下部分和GMVP
          // 注意：不要重复添加GMVP点
          const frontier = [...efficientLower, gmvpPoint, ...efficientUpper];

          console.log('完整有效前沿点数量:', frontier.length);

          return {
            frontier: frontier,
            gmvp: gmvpPoint
          };
        };

        const noShortResult = createFullFrontier(noShortPoints);
        const shortResult = createFullFrontier(shortPoints);

        console.log('GMVP No Short:', noShortResult.gmvp);
        console.log('GMVP Short:', shortResult.gmvp);
        console.log('完整有效前沿No Short:', noShortResult.frontier.length);
        console.log('完整有效前沿Short:', shortResult.frontier.length);

        // 处理基金数据
        const processedFunds = data.funds
          .filter(fund => !(fund.risk === 0 && fund.return === 0)) // 过滤掉风险和收益都为0的基金
          .map(fund => ({
            name: fund.name,
            risk: parseFloat((fund.risk * 100).toFixed(4)),
            return: parseFloat((fund.return * 100).toFixed(4))
          }));

        // 设置处理后的图表数据
        const processedChartData = {
          efficientFrontierNoShort: noShortResult.frontier,
          efficientFrontierShort: shortResult.frontier,
          gmvpNoShort: noShortResult.gmvp,
          gmvpShort: shortResult.gmvp,
          optimalPortNoShort: formattedOptimalPortNoShort,
          optimalPortShort: formattedOptimalPortShort,
          funds: processedFunds
        };

        setChartData(processedChartData);

        // 计算所有点的最大和最小值，以确保所有点都在图表中显示
        const allPoints = [
          ...processedChartData.efficientFrontierNoShort,
          ...processedChartData.efficientFrontierShort,
          ...processedChartData.funds
        ];

        if (processedChartData.optimalPortNoShort) allPoints.push(processedChartData.optimalPortNoShort);
        if (processedChartData.optimalPortShort) allPoints.push(processedChartData.optimalPortShort);
        if (processedChartData.gmvpNoShort) allPoints.push(processedChartData.gmvpNoShort);
        if (processedChartData.gmvpShort) allPoints.push(processedChartData.gmvpShort);

        // 提取所有风险和收益值
        const riskValues = allPoints.map(p => p.risk);
        const returnValues = allPoints.map(p => p.return);

        // 找出最大最小值
        const minRisk = Math.min(...riskValues);
        const maxRisk = Math.max(...riskValues);
        const minReturn = Math.min(...returnValues);
        const maxReturn = Math.max(...returnValues);

        // 增加边距
        const riskPadding = (maxRisk - minRisk) * 0.1;
        const returnPadding = (maxReturn - minReturn) * 0.1;

        // 设置坐标轴范围
        setAxisDomain({
          x: [minRisk - riskPadding, maxRisk + riskPadding],
          y: [minReturn - returnPadding, maxReturn + returnPadding]
        });

        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error loading chart data:', error);
        setIsLoading(false);
      });
  }, []);

  const handleRetry = () => {
    navigate('/');
  };

  // 自定义工具提示组件
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '5px'
        }}>
          {data.name && <p style={{ margin: 0 }}><strong>{data.name}</strong></p>}
          <p style={{ margin: 0 }}>Risk: {data.risk}%</p>
          <p style={{ margin: 0 }}>Return: {data.return}%</p>
        </div>
      );
    }
    return null;
  };

  // 如果没有状态数据，显示默认消息
  if (success === undefined) {
    return (
      <PageContainer>
        <Container>
          <Alert variant="warning">
            No report data available. Please complete the survey first.
          </Alert>
          <Button onClick={handleRetry}>Go to Survey</Button>
        </Container>
      </PageContainer>
    );
  }

  // 如果请求失败，显示错误信息
  if (!success) {
    return (
      <PageContainer>
        <Container>
          <Alert variant="danger">
            <h4>Submission Failed</h4>
            <p>{error || "An unknown error occurred. Please try again."}</p>
          </Alert>
          <Button onClick={handleRetry}>Retry Survey</Button>
        </Container>
      </PageContainer>
    );
  }

  // 请求成功，显示报告
  return (
    <PageContainer>
      <Container>
        <Alert variant="success">
          <h4>Thank you for your responses!</h4>
          <p>{message || "Submission successful"}</p>
        </Alert>

        <h2>Your Report</h2>

        {report ? (
          <ReportContainer>
            <h3>Risk Aversion Factor: {report.risk_aversion ? report.risk_aversion.toFixed(2) : 'N/A'}</h3>
            <p style={{ fontStyle: 'italic' }}>
              Your score ranges from 1.5 to 12, with a lower score indicating a higher risk tolerance.
            </p>
            <p>Total Score: {report.total_score}</p>
            <p>You answered {report.total_questions} questions</p>

            <h3>Efficient Frontier Analysis</h3>
            {isLoading ? (
              <p>Loading chart data...</p>
            ) : (
              <ChartContainer>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="risk"
                      name="Risk"
                      label={{ value: 'Risk (%)', position: 'insideBottom', offset: -5 }}
                      domain={axisDomain.x}
                    />
                    <YAxis
                      type="number"
                      dataKey="return"
                      name="Return"
                      label={{ value: 'Return (%)', angle: -90, position: 'insideLeft' }}
                      domain={axisDomain.y}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{
                        marginTop: 20,  // 增加上边距
                        paddingTop: 15,
                        paddingBottom: 5,
                      }}
                    />

                    {/* 无空头有效前沿 - 使用平滑曲线 */}
                    <Line
                      name="Efficient Frontier (No Short)"
                      data={chartData.efficientFrontierNoShort}
                      type="monotoneX"
                      dataKey="return"
                      stroke="#6a4fad"  // 更深的紫色
                      strokeWidth={2}
                      dot={{ r: 0.5 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false} // 禁用动画以确保曲线平滑显示
                      connectNulls={true} // 连接空值点
                    />

                    {/* 有空头有效前沿 - 使用平滑曲线 */}
                    <Line
                      name="Efficient Frontier (Short)"
                      data={chartData.efficientFrontierShort}
                      type="monotoneX"
                      dataKey="return"
                      stroke="#2a9d5b"  // 更深的绿色
                      strokeWidth={2}
                      dot={{ r: 0.5 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false} // 禁用动画以确保曲线平滑显示
                      connectNulls={true} // 连接空值点
                    />

                    {/* 各个基金 - 使用散点 */}
                    <Scatter
                      name="Individual Funds"
                      data={chartData.funds}
                      fill="#ff7300"
                      shape="circle"
                      legendType="circle"
                      size={10}
                    />

                    {/* GMVP点 - 无空头 */}
                    {chartData.gmvpNoShort && (
                      <ReferenceDot
                        x={chartData.gmvpNoShort.risk}
                        y={chartData.gmvpNoShort.return}
                        r={6}
                        fill="#6a4fad"  // 更深的紫色
                        stroke="white"
                        strokeWidth={1}
                      >
                        <Label value="GMVP (No Short)" position="top" offset={10} fill="#6a4fad" fontSize={12} />
                      </ReferenceDot>
                    )}

                    {/* GMVP点 - 有空头 */}
                    {chartData.gmvpShort && (
                      <ReferenceDot
                        x={chartData.gmvpShort.risk}
                        y={chartData.gmvpShort.return}
                        r={6}
                        fill="#2a9d5b"  // 更深的绿色
                        stroke="white"
                        strokeWidth={1}
                      >
                        <Label value="GMVP (Short)" position="bottom" offset={10} fill="#2a9d5b" fontSize={12} />
                      </ReferenceDot>
                    )}

                    {/* 最优投资组合点 - 无空头 */}
                    {chartData.optimalPortNoShort && (
                      <ReferenceDot
                        x={chartData.optimalPortNoShort.risk}
                        y={chartData.optimalPortNoShort.return}
                        r={5}
                        fill="#6a4fad"  // 更深的紫色
                        stroke="black"
                        strokeWidth={1}
                      >
                        <Label value="Optimal (No Short)" position="top" offset={10} fill="#6a4fad" fontSize={12} />
                      </ReferenceDot>
                    )}

                    {/* 最优投资组合点 - 有空头 */}
                    {chartData.optimalPortShort && (
                      <ReferenceDot
                        x={chartData.optimalPortShort.risk}
                        y={chartData.optimalPortShort.return}
                        r={5}
                        fill="#2a9d5b"  // 更深的绿色
                        stroke="black"
                        strokeWidth={1}
                      >
                        <Label value="Optimal (Short)" position="top" offset={10} fill="#2a9d5b" fontSize={12} />
                      </ReferenceDot>
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}

            <p>
              Based on your risk aversion factor of <strong>{report.risk_aversion ? report.risk_aversion.toFixed(2) : 'N/A'}</strong>,
              we have analyzed your optimal investment allocation along the efficient frontier.
            </p>
            <p>
              <strong>What you are seeing in the chart:</strong>
            </p>
            <ul>
              <li><strong>Efficient Frontiers:</strong> The curved lines represent the best possible return for a given level of risk, both with and without the ability to short sell.</li>

              <li><strong>GMVP Points:</strong> These are the Global Minimum Variance Portfolios - the portfolios with the lowest possible risk.
                {chartData.gmvpNoShort && (
                  <ul>
                    <li>GMVP (No Short): Risk: <strong>{chartData.gmvpNoShort.risk}%</strong>, Return: <strong>{chartData.gmvpNoShort.return}%</strong></li>
                  </ul>
                )}
                {chartData.gmvpShort && (
                  <ul>
                    <li>GMVP (Short): Risk: <strong>{chartData.gmvpShort.risk}%</strong>, Return: <strong>{chartData.gmvpShort.return}%</strong></li>
                  </ul>
                )}
              </li>

              <li><strong>Optimal Portfolios:</strong> These points represent your personalized optimal investment allocation based on your risk tolerance.
                {chartData.optimalPortNoShort && (
                  <ul>
                    <li>Optimal Portfolio (No Short): Risk: <strong>{chartData.optimalPortNoShort.risk}%</strong>, Return: <strong>{chartData.optimalPortNoShort.return}%</strong></li>
                  </ul>
                )}
                {chartData.optimalPortShort && (
                  <ul>
                    <li>Optimal Portfolio (Short): Risk: <strong>{chartData.optimalPortShort.risk}%</strong>, Return: <strong>{chartData.optimalPortShort.return}%</strong></li>
                  </ul>
                )}
              </li>

              <li><strong>Individual Funds:</strong> Orange dots show individual funds in the risk-return space.</li>
            </ul>

          </ReportContainer>
        ) : (
          <Alert variant="warning">No report data to display.</Alert>
        )}

        <Button onClick={handleRetry}>Take Survey Again</Button>
      </Container>
    </PageContainer>
  );
}

export default Report;