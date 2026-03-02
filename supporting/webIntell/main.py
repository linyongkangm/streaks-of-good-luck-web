import click
import tasks
import uvicorn
import utils
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
    issue_date: str  # 文章发布日期


class AkShareRequest(BaseModel):
    """AkShare 调用请求模型"""

    method: str  # akshare 方法名
    params: dict = {}  # 方法参数


class MilestoneKeywordRequest(BaseModel):
    """里程碑关键词提取请求模型"""

    title: str
    description: str | None = None


class MilestoneImpactRequest(BaseModel):
    """里程碑影响判断请求模型"""

    title: str
    description: str | None = None
    context: str | None = None


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
        issue_date = data.get("issue_date")
        if not source_text:
            return {"success": False, "message": "No source_text provided"}
        logger.info("开始分析文章 ...")
        result = await tasks.gen_article_analysis(source_text, issue_date)
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


# /extract-milestone-keyword 路由
@app.post("/extract-milestone-keyword")
async def api_extract_milestone_keyword(request: MilestoneKeywordRequest):
    """API 接口：提取里程碑关键词（2-4个中文汉字）"""
    logger = utils.locator.get_project_logger()

    try:
        if not request.title:
            return {"success": False, "message": "title is required"}

        keyword = await tasks.gen_milestone_keyword(
            request.title,
            request.description or "",
        )

        return {
            "success": True,
            "keyword": keyword,
        }
    except Exception as e:
        import traceback

        logger.error(f"✗ 里程碑关键词提取失败: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# /extract-milestone-impact 路由
@app.post("/extract-milestone-impact")
async def api_extract_milestone_impact(request: MilestoneImpactRequest):
    """API 接口：判断里程碑对行业/公司的影响（超正面、正面、中性、负面、超负面）"""
    logger = utils.locator.get_project_logger()

    try:
        if not request.title:
            return {"success": False, "message": "title is required"}

        impact = await tasks.gen_milestone_impact(
            request.title,
            request.description or "",
            request.context or "",
        )

        return {
            "success": True,
            "impact": impact,
        }
    except Exception as e:
        import traceback

        logger.error(f"✗ 里程碑影响判断失败: {e}")
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
        "article_text": "文章文本内容",
        "issue_date": "文章发布日期"
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
            return {"success": False, "message": "No article_text provided"}

        logger.info(f"文章长度：{len(article_text)} 字符")

        # 调用预测提取函数
        predicts = await tasks.gen_predicts(article_text, request.issue_date)

        logger.info(f"✓ 提取完成，共 {len(predicts)} 个预测")

        return {
            "success": True,
            "predicts": predicts,
            "count": len(predicts),
            "message": f"Successfully extracted {len(predicts)} predictions",
        }
    except Exception as e:
        import traceback

        logger.error(f"✗ 提取预测失败: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# /call-akshare 路由
@app.post("/call-akshare")
async def api_call_akshare(request: AkShareRequest):
    """API 接口：调用 AkShare 方法获取数据

    请求体:
    {
        "method": "stock_individual_info_em",
        "params": {"symbol": "000001"}
    }

    返回:
    {
        "success": true/false,
        "data": [...],
        "count": 数据条数,
        "method": 调用的方法名
    }
    """
    logger = utils.locator.get_project_logger()

    try:
        logger.info(f"=== 调用 AkShare 方法: {request.method} ===")
        logger.info(f"参数: {request.params}")

        # 调用 akshare 方法
        result = await tasks.call_akshare(request.method, **request.params)

        logger.info(f"✓ 调用完成，返回 {len(result)} 条数据")

        return {
            "success": True,
            "data": result,
            "count": len(result),
            "method": request.method,
            "message": f"Successfully retrieved {len(result)} records",
        }
    except AttributeError as e:
        logger.error(f"✗ 方法不存在: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import traceback

        logger.error(f"✗ 调用失败: {e}")
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
@app.get("/test")
async def test():
    """运行测试任务"""
    click.echo("运行测试任务...")
    source_text = "这是一个测试文章，用于验证文章分析功能是否正常工作。文章内容包含多个段落，涵盖不同的主题和观点。我们希望模型能够正确地提取出文章的主要内容，并生成准确的标签和摘要。"
    issue_date = "2024-06-01"
    await tasks.gen_article_analysis(source_text, issue_date)
    # 在这里添加测试任务调用
    click.echo("测试任务完成。")


if __name__ == "__main__":
    cli()
