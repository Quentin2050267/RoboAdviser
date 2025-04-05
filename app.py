from flask import Flask, request, jsonify, send_from_directory
import os
import json
from backend.backend import main

ON_HEROKU = True

# 初始化 Flask 应用
if not ON_HEROKU:
    app = Flask(__name__, static_folder='frontend/build', static_url_path='')
if ON_HEROKU:
    app = Flask(__name__, static_folder="static")

if not ON_HEROKU:
    @app.route('/')
    def index():
        return app.send_static_file('index.html')

if ON_HEROKU:
    @app.route("/")
    def index():
        return send_from_directory("static", "index.html")
    @app.route("/<path:path>")
    def catch_all(path):
        return send_from_directory("static", "index.html")


@app.route('/submit', methods=['POST'])
def submit():
    data = request.get_json()
    answers = data['answers']
    weights = data['weights']
    
    # 生成分析报告
    try:
        report = generate_report(answers, weights)
        return jsonify({"message": "Submit successfully", "report": report})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def generate_report(answers, weights, filename=r"backend/frontend.json"):
    # 定义分数映射
    score_map = { "A": 12, "B": 6, "C": 3.5, "D": 2.5, "E": 1.5 }
    
    # 计算总分
    total_score = 0
    Smin = 0
    Smax = 0
    for i, answer in enumerate(answers):
        score = score_map.get(answer[0], 0)
        total_score += score* weights[i]
        Smin += score_map.get("E") * weights[i]
        Smax += score_map.get("A") * weights[i]

    # 归一化到[1.5, 12]，得出风险厌恶系数
    risk_aversion = score_map.get("E") + (total_score - Smin) / (Smax - Smin) * (
        score_map.get("A") - score_map.get("E")
    )
    
    report = {
        "total_questions": len(answers),
        "answers": answers,
        "total_score": total_score,
        "risk_aversion": risk_aversion,
    }

    # 将报告保存到json文件
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(json.dumps(report, indent=4))

    main(data=report)  # 调用主函数进行计算

    return report

# 启动 Flask 应用
if __name__ == '__main__':
    if not ON_HEROKU:
        app.run(debug=True)
    if ON_HEROKU:
        port = int(os.environ.get('PORT', 5000))  # 默认使用 5000（本地开发时）
        app.run(host='0.0.0.0', port=port)