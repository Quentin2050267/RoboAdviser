import json
import numpy as np
import pandas as pd
from scipy.optimize import minimize


def classify_score(score, risk_aversion_list
) -> int:
    for i, threshold in enumerate(risk_aversion_list):
        if score <= threshold:
            return threshold


def get_category_from_json(json_data, risk_aversion_list):
    total_score = json_data.get("total_score", 0)
    return classify_score(total_score, risk_aversion_list)


def load_data(prices_csv: pd.DataFrame,
              details_csv: pd.DataFrame
):
    """
    参数:
    - prices_csv: 基金价格 CSV 文件路径 (fund_prices.csv)
    - details_csv: 基金详情 CSV 文件路径 (fund_detail.csv)

    返回:
    - prices: 价格数据 (DataFrame, index=Date)
    - code_to_name: 基金代码到名称的映射 (dict)
    - fund_list: 选择的基金代码 (list)
    """
    prices = pd.read_csv(prices_csv, parse_dates=['Date']).set_index('Date')
    details = pd.read_csv(details_csv)

    code_to_name = details.set_index('code')['fund_name'].to_dict()
    # fund_list = prices.columns[1:][:11]

    return prices, code_to_name#, fund_list


def compute_optimal_weights(risk_aversion,
                            returns,
                            allow_short=False
):
    """
    计算最优投资组合权重（允许或不允许空头）。

    参数:
    risk_aversion (int): 风险厌恶系数
    returns (pd.DataFrame): 日收益率数据，时间 x 股票
    allow_short (bool): 是否允许空头，默认 False

    返回:
    - weights_df (pd.DataFrame): 投资组合的最优权重
    """
    expected_returns = returns.mean().values * 252
    varcov = returns.cov().values * 252
    num_assets = len(expected_returns)

    # min var
    def portfolio_variance(weights):
        return np.dot(weights.T, np.dot(varcov, weights))

    # constraints
    constraints = {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}

    if allow_short:
        bounds = None  # 允许空头，不设边界
    else:
        bounds = tuple((0, 1) for _ in range(num_assets))  # 0~1之间

    initial_guess = np.array([1.0 / num_assets] * num_assets)

    result = minimize(portfolio_variance, initial_guess, bounds=bounds, constraints=constraints)

    if result.success:
        weights_df = pd.DataFrame(result.x, index=returns.columns, columns=[f"Risk Aversion {risk_aversion}"])
    else:
        raise ValueError("Optimization failed")

    return weights_df


def generate_efficient_frontier_data(weights_no_short, weights_short, returns, code_to_name):
    """
    参数:
    - weights_no_short (pd.DataFrame): 不允许空头的最优权重
    - weights_short (pd.DataFrame): 允许空头的最优权重
    - returns (pd.DataFrame): 日收益率数据
    - code_to_name (dict): 代码 -> 基金名称映射

    返回:
    - JSON 字符串，包含有效前沿数据和单个基金数据
    """
    # 计算年化收益和协方差矩阵
    expected_returns = returns.mean().values * 252
    varcov = returns.cov().values * 252
    num_assets = len(expected_returns)
    stock_risks = returns.std().values * np.sqrt(252)

    target_returns = np.linspace(expected_returns.min(), expected_returns.max(), 50)

    def compute_frontier(allow_short):
        portfolio_risks = []
        valid_target_returns = []

        for target in target_returns:
            constraints = (
                {'type': 'eq', 'fun': lambda w: np.sum(w) - 1},
                {'type': 'eq', 'fun': lambda w: np.dot(w, expected_returns) - target},
            )

            if allow_short:
                bounds = None  # 允许空头
            else:
                bounds = tuple((0, 1) for _ in range(num_assets))  # 不允许空头

            initial_guess = np.array([1.0 / num_assets] * num_assets)
            result = minimize(lambda w: np.dot(w.T, np.dot(varcov, w)),
                              initial_guess, bounds=bounds, constraints=constraints)

            if result.success:
                portfolio_risks.append(np.sqrt(result.fun))
                valid_target_returns.append(target)

        return [{"risk": r, "return": ret} for r, ret in zip(portfolio_risks, valid_target_returns)]

    # 计算有效前沿数据
    efficient_frontier_no_short = compute_frontier(weights_no_short, allow_short=False)
    efficient_frontier_short = compute_frontier(weights_short, allow_short=True)

    # 生成 JSON 数据
    chart_data = {
        "efficient_frontier_no_short": efficient_frontier_no_short,
        "efficient_frontier_short": efficient_frontier_short,
        "funds": [{"name": code_to_name.get(code, code), "risk": stock_risks[i], "return": expected_returns[i]}
                  for i, code in enumerate(returns.columns)]
    }

    return json.dumps(chart_data, indent=4)

# ---示例调用---
with open("frontend.json", "r", encoding="utf-8") as file:
    data = json.load(file)

risk_aversion_list = [1.5, 2.5, 3.5, 6, 12]
category_result = get_category_from_json(data, risk_aversion_list)
print(category_result)

prices_df, code_to_name = load_data('fund_prices.csv', 'fund_detail.csv')
returns_df = prices_df.pct_change().dropna()

weights_no_short = compute_optimal_weights(risk_aversion=category_result, returns=returns_df, allow_short=False)
weights_short = compute_optimal_weights(risk_aversion=category_result, returns=returns_df, allow_short=True)
# print(weights_no_short, weights_short)

chart_json = generate_efficient_frontier_data(weights_no_short, weights_short, returns_df, code_to_name)
with open("backend.json", "w") as f:
    f.write(chart_json)

