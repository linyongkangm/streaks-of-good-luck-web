import asyncio
import click
import tasks
import json
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import sys
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional

# from tasks import (
#     add_companies,
#     associate_board_to_companies,
#     add_company_finance_indicators,
#     store_tweet_from_file,
#     gen_tweet_analysis,
#     store_qiushi_from_file,
# )

# 创建 FastAPI 应用
app = FastAPI(title="Streaks of Good Luck API")


# ==================== Pydantic 模型 ====================

class TweetAnalysisRequest(BaseModel):
    """推文分析请求模型"""
    collect_from: str
    date: str  # YYYY-MM-DD 格式
    tweet_infos: list  # 推文信息列表


# ==================== 数据库操作 ====================

# 数据库操作由 Next.js 负责，Python API 不进行数据库操作


# ==================== API 路由 ====================


# ==================== CLI 命令 ====================


@click.group()
def cli():
    """Streaks of Good Luck - 数据管理工具"""
    pass


# @cli.command()
# @click.argument('codes', nargs=-1, required=True)
# def add_company(codes):
#     """添加公司信息

#     示例: python main.py add-company 601988 000001
#     """
#     asyncio.run(add_companies(list(codes)))
#     click.echo(f"✓ 成功添加 {len(codes)} 家公司")


# @cli.command()
# @click.argument('board_id', type=int)
# @click.argument('company_weights', type=str)
# def associate_board(board_id, company_weights):
#     """关联板块和公司

#     示例: python main.py associate-board 1 "14:0.5,15:0.3"
#     """
#     # 解析公司权重字符串，格式: "14:0.5,15:0.3"
#     weights = {}
#     for item in company_weights.split(','):
#         company_id, weight = item.split(':')
#         weights[int(company_id)] = float(weight)

#     asyncio.run(associate_board_to_companies(board_id, weights))
#     click.echo(f"✓ 成功关联板块 {board_id} 和 {len(weights)} 家公司")


# @cli.command()
# @click.argument('company_id', type=int)
# @click.option('--start-date', default=None, help='开始日期 (YYYY-MM-DD)')
# def add_finance_indicators(company_id, start_date):
#     """添加公司财报指标数据

#     示例: python main.py add-finance-indicators 14 --start-date 2023-01-01
#     """
#     start = datetime.strptime(start_date, '%Y-%m-%d').date() if start_date else date(2023, 1, 1)
#     asyncio.run(add_company_finance_indicators(company_id=company_id, start_date=start))
#     click.echo(f"✓ 成功添加公司 {company_id} 的财报指标数据")


# @cli.command()
# def store_tweet():
#     """存储推特数据

#     示例: python main.py store-tweet
#     """
#     asyncio.run(store_tweet_from_file())
#     click.echo("✓ 成功存储推特数据")


# @cli.command()
# def store_qiushi():
#     """存储求是数据

#     示例: python main.py store-qiushi
#     """
#     asyncio.run(store_qiushi_from_file())
#     click.echo("✓ 成功存储求是数据")


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok"}


@app.post("/analyze-tweet")
async def api_analyze_tweet(request: TweetAnalysisRequest):
    """API 接口：生成推特分析
    
    请求体:
    {
        "collect_from": "source_name",
        "date": "YYYY-MM-DD",
        "tweet_infos": [
            {
                "tweet_date": "YYYY-MM-DD",
                "user_name": "user",
                "tweet_from": "twitter",
                "tweet_text": "content"
            }
        ]
    }
    
    流程：
    1. 接收 tweet_infos（由 Next.js 查询和传递）
    2. 调用 AI 模型生成分析摘要
    3. 返回分析结果
    4. Next.js 负责保存结果到数据库
    """
    import utils
    logger = utils.locator.get_project_logger()
    
    try:
        logger.info(f"=== 开始分析推文 [{request.collect_from}] {request.date} ===")
        
        # 1. 获取客户端传递的 tweet_infos（由 Next.js 从数据库查询）
        tweet_infos = request.tweet_infos
        if not tweet_infos:
            logger.info(f"未提供推文数据")
            return {
                "success": False,
                "message": "No tweets provided",
                "collect_from": request.collect_from,
                "date": request.date
            }
        
        logger.info(f"获得 {len(tweet_infos)} 条推文")
        
        # 2. 转换为推文对象格式（gen_tweet_analysis 需要的格式）
        class TweetInfo:
            def __init__(self, info_dict):
                self.tweet_date = info_dict.get('tweet_date')
                self.user_name = info_dict.get('user_name')
                self.tweet_from = info_dict.get('tweet_from')
                self.tweet_text = info_dict.get('tweet_text')
        
        tweet_objects = [TweetInfo(info) for info in tweet_infos]
        
        # 3. 调用分析函数
        logger.info("生成推文分析...")
        analysis_result = await tasks.gen_tweet_analysis(tweet_objects)
        
        if not analysis_result:
            logger.warning("分析未返回结果")
            return {
                "success": False,
                "message": "Analysis returned no result",
                "collect_from": request.collect_from,
                "date": request.date
            }
        
        logger.info(f"✓ 分析完成，返回结果给 Next.js")
        
        # 4. 返回分析结果（由 Next.js 保存到数据库）
        return {
            "success": True,
            "message": f"Successfully analyzed {len(tweet_infos)} tweets",
            "collect_from": request.collect_from,
            "date": request.date,
            "tweet_count": len(tweet_infos),
            "analysis": analysis_result
        }
    except Exception as e:
        import traceback
        logger.error(f"✗ 分析失败: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@cli.command()
@click.option("--file", default=None, help="推文文件路径")
def analyze_tweet(file):
    """生成推特分析

    示例: python main.py analyze-tweet --file "path/to/tweet_files.json"
    """
    content = open(file, mode="r", encoding="utf-8").read()
    tweet_infos = json.loads(content)
    result = asyncio.run(tasks.gen_tweet_analysis(tweet_infos))
    click.echo(result)


@cli.command()
def test():
    """测试命令
    示例: python main.py test
    """
    asyncio.run(tasks.test())
    click.echo("✓ 成功执行测试命令")


@cli.command()
@click.option("--host", default="127.0.0.1", help="服务器地址")
@click.option("--port", type=int, default=8000, help="服务器端口")
def server(host, port):
    """启动 API 服务器

    示例: python main.py server --host 0.0.0.0 --port 8000
    """
    click.echo(f"🚀 启动服务器 http://{host}:{port}")
    click.echo(f"📚 API 文档: http://{host}:{port}/docs")
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    cli()
