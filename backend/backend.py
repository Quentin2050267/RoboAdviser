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
    prices,
    risk_aversion,
    returns_df,  # 没用上，懒得改了
    code_to_name=None,
    filename=r"backend.json"
):
    """
    生成有效前沿数据并以JSON格式返回，包括普通有效前沿和允许做空的有效前沿

    参数:
    - prices (pd.DataFrame): 价格数据
    - risk_aversion (float): 风险厌恶系数
    - returns_df (pd.DataFrame): 日收益率数据，用于确定资产代码
    - code_to_name (dict): 代码 -> 基金名称映射
    - filename (str): 输出文件路径

    返回:
    - JSON 字符串，包含有效前沿数据和最优投资组合数据
    """
    import json
    import numpy as np
    import matplotlib.pyplot as plt
    from pypfopt import EfficientFrontier, expected_returns, risk_models

    # 计算预期收益率和协方差矩阵
    mu = expected_returns.mean_historical_return(prices)
    S = risk_models.sample_cov(prices)

    # 从期望收益和协方差矩阵提取单个资产风险
    asset_returns = mu.values
    asset_risks = np.sqrt(np.diag(S.values))

    # 定义辅助函数，使用系统性方法生成有效前沿
    def compute_frontier(allow_short):
        weight_bounds = (-1, 1) if allow_short else (0, 1)

        # 生成一系列目标回报的最小风险投资组合
        # 让目标回报率范围更广，向右扩展以获取更多的有效前沿点
        target_min = np.min(asset_returns) - 0.05
        target_max = np.max(asset_returns) + 0.2  # 向右扩展更多
        target_returns = np.linspace(target_min, target_max, 100)  # 增加点数

        portfolio_risks = []
        valid_target_returns = []

        # 为每个目标回报率创建新的EfficientFrontier实例
        for target in target_returns:
            try:
                ef = EfficientFrontier(mu, S, weight_bounds=weight_bounds)
                if allow_short:
                    ef.add_constraint(lambda w: w >= -1)
                ef.add_constraint(lambda w: sum(w) == 1)

                # 设置目标回报率并最小化波动率
                ef.efficient_return(target_return=target)
                ret, vol, _ = ef.portfolio_performance()

                if not np.isnan(vol) and not np.isnan(ret):
                    portfolio_risks.append(vol)
                    valid_target_returns.append(ret)
            except Exception:
                continue

        # 添加最大夏普比率和最小波动率投资组合
        try:
            ef_max_sharpe = EfficientFrontier(mu, S, weight_bounds=weight_bounds)
            if allow_short:
                ef_max_sharpe.add_constraint(lambda w: w >= -1)
            ef_max_sharpe.add_constraint(lambda w: sum(w) == 1)
            ef_max_sharpe.max_sharpe()
            ret, vol, _ = ef_max_sharpe.portfolio_performance()
            portfolio_risks.append(vol)
            valid_target_returns.append(ret)

            ef_min_vol = EfficientFrontier(mu, S, weight_bounds=weight_bounds)
            if allow_short:
                ef_min_vol.add_constraint(lambda w: w >= -1)
            ef_min_vol.add_constraint(lambda w: sum(w) == 1)
            ef_min_vol.min_volatility()
            ret, vol, _ = ef_min_vol.portfolio_performance()
            portfolio_risks.append(vol)
            valid_target_returns.append(ret)
        except Exception as e:
            print(f"生成最优投资组合失败: {str(e)}")

        # 排序并格式化点
        if len(portfolio_risks) > 0:
            sorted_data = sorted(zip(portfolio_risks, valid_target_returns))
            sorted_risks = [x[0] for x in sorted_data]
            sorted_returns = [x[1] for x in sorted_data]

            return [{"risk": float(r), "return": float(ret)}
                    for r, ret in zip(sorted_risks, sorted_returns)]
        else:
            # 最后的备用：至少返回几个单个资产的点
            return [{"risk": float(asset_risks[i]), "return": float(asset_returns[i])}
                    for i in range(len(asset_returns))]

    # 生成两种有效前沿
    efficient_frontier_no_short = compute_frontier(allow_short=False)
    efficient_frontier_short = compute_frontier(allow_short=True)

    # 3. 计算不允许做空的最优投资组合 (根据风险厌恶系数)
    ef_no_short_optimal = EfficientFrontier(mu, S, weight_bounds=(0, 1))
    ef_no_short_optimal.add_constraint(lambda w: sum(w) == 1)
    weights_no_short = ef_no_short_optimal.max_quadratic_utility(risk_aversion=risk_aversion)
    returns_no_short, volatility_no_short, _ = ef_no_short_optimal.portfolio_performance()

    # 4. 计算允许做空的最优投资组合 (根据风险厌恶系数)
    ef_optimal = EfficientFrontier(mu, S, weight_bounds=(-1, 1))
    ef_optimal.add_constraint(lambda w: sum(w) == 1)
    ef_optimal.add_constraint(lambda w: w >= -1)
    weights = ef_optimal.max_quadratic_utility(risk_aversion=risk_aversion)
    returns, volatility, _ = ef_optimal.portfolio_performance()

    # 5. 构建JSON数据结构
    if code_to_name is None:
        code_to_name = {}  # 如果没有提供映射，使用空字典

    # 使用价格DataFrame的列作为资产代码
    asset_codes = prices.columns

    chart_data = {
        "efficient_frontier_no_short": efficient_frontier_no_short,
        "efficient_frontier_short": efficient_frontier_short,
        "funds": [
            {"name": code_to_name.get(code, code), "risk": float(asset_risks[i]), "return": float(asset_returns[i])}
            for i, code in enumerate(asset_codes)]
    }

    # 添加最优投资组合数据
    chart_data["optimal_portfolio"] = [
        {"name": "No Short", "risk": float(volatility_no_short), "return": float(returns_no_short)},
        {"name": "Short", "risk": float(volatility), "return": float(returns)}
    ]

    # 6. 保存JSON数据到文件
    with open(filename, "w") as f:
        json.dump(chart_data, f, indent=4)

    return json.dumps(chart_data, indent=4)

def main(data=None, path="./", filename="backend.json"):
    if data is None:
        with open("frontend.json", "r", encoding="utf-8") as file:
            data = json.load(file)

    risk_aversion = data.get("risk_aversion", 0)
    print(risk_aversion)

    prices_df, code_to_name = load_data('fund_prices.csv', 'fund_detail.csv')
    returns_df = prices_df.pct_change().dropna()

    
    # -----------正式代码可以注释掉-----------
    weights_no_short = compute_optimal_weights(returns=returns_df, allow_short=False)
    weights_short = compute_optimal_weights(returns=returns_df, allow_short=True)
    print(weights_no_short)
    print(weights_short)
    print(weights_no_short.sum(), weights_short.sum())
    # -------------------------------------

    weights_aversion_no_short = compute_optimal_weights_aversion(risk_aversion=risk_aversion, returns=returns_df, allow_short=False)
    weights_aversion_short = compute_optimal_weights_aversion(risk_aversion=risk_aversion, returns=returns_df, allow_short=True)
    print(weights_aversion_no_short)
    print(weights_aversion_short)
    print(weights_aversion_no_short.sum(), weights_aversion_short.sum())
    
    filename = os.path.join(path, filename)
    chart_json = generate_efficient_frontier_data(
        prices_df,
        risk_aversion,
        returns_df, code_to_name)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(chart_json)



if __name__ == "__main__":
    main()