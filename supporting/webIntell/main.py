import click
import tasks
import uvicorn
import utils
from typing import List, cast
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel



# 创建 FastAPI 应用
app = FastAPI(title="Streaks of Good Luck API")


# ==================== Pydantic 模型 ====================


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok"}


# 文章分析请求模型
class ArticleAnalysisRequest(BaseModel):
    source_text: str


class TweetAnalysisRequest(BaseModel):
    """推文分析请求模型"""

    collect_from: str
    date: str  # YYYY-MM-DD 格式
    tweet_infos: list  # 推文信息列表


class PredictExtractionRequest(BaseModel):
    """预测提取请求模型"""
    
    article_text: str  # 文章文本内容


# ==================== 数据库操作 ====================

# 数据库操作由 Next.js 负责，Python API 不进行数据库操作


# ==================== API 路由 ====================


# /analyze-article 路由
@app.post("/analyze-article")
async def api_analyze_article(request: Request):
    """API 接口：生成文章分析（标签+摘要）

    请求体:
    {
        "source_text": "文章原文"
    }
    返回:
    {
        "success": true/false,
        "analysis": {"tags": "...", "summary": "..."}
    }
    """
    logger = utils.locator.get_project_logger()
    try:
        data = await request.json()
        source_text = data.get("source_text")
        if not source_text:
            return {"success": False, "message": "No source_text provided"}
        logger.info("开始分析文章 ...")
        result = await tasks.gen_article_analysis(source_text)
        if not result:
            logger.warning("分析未返回结果")
            return {"success": False, "message": "Analysis returned no result"}
        logger.info("✓ 文章分析完成")
        return {"success": True, "analysis": result}
    except Exception as e:
        import traceback

        logger.error(f"✗ 文章分析失败: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# /analyze-tweet 路由
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
                "date": request.date,
            }

        logger.info(f"获得 {len(tweet_infos)} 条推文")

        # 2. 转换为推文对象格式（gen_tweet_analysis 需要的格式）
        class TweetInfo:
            def __init__(self, info_dict):
                self.tweet_date = info_dict.get("tweet_date")
                self.user_name = info_dict.get("user_name")
                self.tweet_from = info_dict.get("tweet_from")
                self.tweet_text = info_dict.get("tweet_text")

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
                "date": request.date,
            }

        logger.info(f"✓ 分析完成，返回结果给 Next.js")

        # 4. 返回分析结果（由 Next.js 保存到数据库）
        return {
            "success": True,
            "message": f"Successfully analyzed {len(tweet_infos)} tweets",
            "collect_from": request.collect_from,
            "date": request.date,
            "tweet_count": len(tweet_infos),
            "analysis": analysis_result,
        }
    except Exception as e:
        import traceback

        logger.error(f"✗ 分析失败: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# /extract-predicts 路由
@app.post("/extract-predicts")
async def api_extract_predicts(request: PredictExtractionRequest):
    """API 接口：从文章中提取预测

    请求体:
    {
        "article_text": "文章文本内容"
    }
    
    返回:
    {
        "success": true/false,
        "predicts": [
            {
                "interval_start": "YYYY-MM-DD",
                "interval_end": "YYYY-MM-DD",
                "content": "预测内容"
            }
        ],
        "count": 提取到的预测数量
    }
    """
    logger = utils.locator.get_project_logger()
    
    try:
        logger.info("=== 开始提取文章预测 ===")
        
        article_text = request.article_text
        if not article_text:
            return {
                "success": False,
                "message": "No article_text provided"
            }
        
        logger.info(f"文章长度：{len(article_text)} 字符")
        
        # 调用预测提取函数
        predicts = await tasks.gen_predicts(article_text)
        
        logger.info(f"✓ 提取完成，共 {len(predicts)} 个预测")
        
        return {
            "success": True,
            "predicts": predicts,
            "count": len(predicts),
            "message": f"Successfully extracted {len(predicts)} predictions"
        }
    except Exception as e:
        import traceback
        logger.error(f"✗ 提取预测失败: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@click.group()
def cli():
    """Streaks of Good Luck - 数据管理工具"""
    pass


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

@cli.command()
def test():
    """运行测试任务"""
    agents = utils.locator.get_agents()
    messages = [
        {
            "role": "user",
            "content": '请说一句中文问候语。',
        }
    ]
    responseText = agents.think(cast(List, messages))
    click.echo("运行测试任务...")
    # 在这里添加测试任务调用
    click.echo("测试任务完成。")

if __name__ == "__main__":
    cli()
