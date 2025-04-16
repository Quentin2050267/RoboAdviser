import json
import numpy as np
import pandas as pd
from scipy.optimize import minimize
import os

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


def compute_optimal_weights(returns,
                            allow_short=False
):
    """
    计算最优投资组合权重（允许或不允许空头）。

    参数:
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
        weights_df = pd.DataFrame(result.x, index=returns.columns, columns=[f"Weight_{allow_short}"])
    else:
        raise ValueError("Optimization failed")

    return weights_df

def compute_optimal_weights_aversion(risk_aversion,
                                    returns,
                                     allow_short=False):
    """
    基于投资者对风险的厌恶程度计算最优投资组合权重（允许或不允许空头）。

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

    def negative_utility(weights, risk_aversion):
        portfolio_return = np.dot(weights, expected_returns)          # r = w^T * R
        portfolio_variance = np.dot(weights.T, np.dot(varcov, weights))  # sigma^2 = w^T * VarCov * w
        utility = portfolio_return - (risk_aversion / 2) * portfolio_variance  # U = r - (A/2) * sigma^2
        return -utility  # 最小化 -U 等价于最大化 U
    
    # 约束条件
    constraints = {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}  # 权重和为1
    if allow_short:
        bounds = None
    else:
        bounds = tuple((0, 1) for _ in range(num_assets))
    initial_guess = np.array([1.0 / num_assets] * num_assets)
    
    # 使用 minimize 优化
    result = minimize(
        fun=negative_utility,                # 目标函数
        x0=initial_guess,                    # 初始值
        args=(risk_aversion,),               # 传递风险厌恶系数
        bounds=bounds,                       # 边界条件
        constraints=constraints,             # 约束条件
        method='SLSQP'                       # 非线性优化方法，与 GRG Nonlinear 类似
    )

    if result.success:
        weights_df = pd.DataFrame(result.x, index=returns.columns, columns=[f"Weight_Aversion_{allow_short}"])
    else:
        raise ValueError("Optimization failed")
    return weights_df

def generate_efficient_frontier_data(
        weights_no_short,
        weights_short,
        returns, 
        code_to_name,
        filename=r"backend/backend.json"):
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


    target_min = np.min(expected_returns)-20
    target_max = np.max(expected_returns)+20
    # 生成目标收益率范围
    target_returns = np.linspace(target_min, target_max, 100)

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

    if not os.path.exists(filename):
        # 计算有效前沿数据
        efficient_frontier_no_short = compute_frontier(allow_short=False)
        efficient_frontier_short = compute_frontier(allow_short=True)
        chart_data = {
            "efficient_frontier_no_short": efficient_frontier_no_short,
            "efficient_frontier_short": efficient_frontier_short,
            "funds": [{"name": code_to_name.get(code, code), "risk": stock_risks[i], "return": expected_returns[i]}
                      for i, code in enumerate(returns.columns)],
        }
    else:
        with open(filename, "r") as f:
            chart_data = json.load(f)


    # 根据权重计算最优投资组合return和risk
    optimal_weights_no_short = weights_no_short.values.flatten()
    optimal_weights_short = weights_short.values.flatten()
    optimal_return_no_short = np.dot(optimal_weights_no_short, expected_returns)
    optimal_return_short = np.dot(optimal_weights_short, expected_returns)
    optimal_risk_no_short = np.sqrt(np.dot(optimal_weights_no_short.T, np.dot(varcov, optimal_weights_no_short)))
    optimal_risk_short = np.sqrt(np.dot(optimal_weights_short.T, np.dot(varcov, optimal_weights_short)))

    chart_data["optimal_portfolio"] = [{"name": "No Short", "risk": optimal_risk_no_short, "return": optimal_return_no_short},
                                        {"name": "Short", "risk": optimal_risk_short, "return": optimal_return_short}]

    return json.dumps(chart_data, indent=4)

def main(data=None, path="./", filename="backend.json"):
    if data is None:
        with open("frontend.json", "r", encoding="utf-8") as file:
            data = json.load(file)

    

    risk_aversion = data.get("risk_aversion", 0)
    print(risk_aversion)

    fund_prices_path = os.path.join(path, 'fund_prices.csv')
    fund_details_path = os.path.join(path, 'fund_detail.csv')
    prices_df, code_to_name = load_data(fund_prices_path, fund_details_path)
    returns_df = prices_df.pct_change().dropna()

    
    # -----------正式代码可以注释掉-----------
    # weights_no_short = compute_optimal_weights(returns=returns_df, allow_short=False)
    # weights_short = compute_optimal_weights(returns=returns_df, allow_short=True)
    # print(weights_no_short)
    # print(weights_short)
    # print(weights_no_short.sum(), weights_short.sum())
    # -------------------------------------

    weights_aversion_no_short = compute_optimal_weights_aversion(risk_aversion=risk_aversion, returns=returns_df, allow_short=False)
    weights_aversion_short = compute_optimal_weights_aversion(risk_aversion=risk_aversion, returns=returns_df, allow_short=True)
    # print(weights_aversion_no_short)
    # print(weights_aversion_short)
    # print(weights_aversion_no_short.sum(), weights_aversion_short.sum())
    
    filename = os.path.join(path, filename)
    chart_json = generate_efficient_frontier_data(
        weights_aversion_no_short, weights_aversion_short,
        returns_df, code_to_name)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(chart_json)



if __name__ == "__main__":
    main()