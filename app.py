from flask import Flask, request, jsonify, send_from_directory
import os


# 初始化 Flask 应用
# app = Flask(__name__, static_folder='frontend/build', static_url_path='')
app = Flask(__name__, static_folder="static")

# # 路由和视图函数
# @app.route('/')
# def index():
#     return app.send_static_file('index.html')
@app.route("/")
def index():
    return send_from_directory("static", "index.html")
@app.route("/<path:path>")
def catch_all(path):
    return send_from_directory("static", "index.html")


@app.route('/about')
def about():
    return "<h1>关于我们</h1>"

@app.route('/submit', methods=['POST'])
def submit():
    data = request.get_json()
    answers = data['answers']
    # 处理表单数据，例如保存到数据库或发送邮件
    print(f"用户回答: {answers}")
    
    # 生成分析报告
    report = generate_report(answers)
    
    return jsonify({"message": "提交成功", "report": report})

def generate_report(answers):
    # 生成分析报告的逻辑
    report = {
        "total_questions": len(answers),
        "answers": answers,
        # 添加更多分析内容
    }
    return report

# 启动 Flask 应用
if __name__ == '__main__':
    # app.run(debug=True)
    port = int(os.environ.get('PORT', 5000))  # 默认使用 5000（本地开发时）
    # 监听所有 IP 地址（0.0.0.0）和指定端口
    app.run(host='0.0.0.0', port=port)