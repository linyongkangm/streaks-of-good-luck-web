import utils
from typing import cast, List
import re
import asyncio
import os

# 行业景气度分析提示词模板
INDUSTRY_PROSPERITY_ANALYSIS_PROMPT_TEMPLATE = """
你是一名资深的行业分析师。请根据提供的行业报告详细分析该行业的景气度状况。

请从以下四个维度进行分析，并用中文用以下格式返回结果：

Demand:需求信号分析（200字以内）- 分析行业的需求状况、增长趋势、消费者需求变化等
Price:价格信号分析（200字以内）- 分析商品/服务的价格走势、毛利率变化、定价权等
Supply:供给信号分析（200字以内）- 分析产能、产量、库存、企业扩产/减产计划等
Profitability:盈利信号分析（200字以内）- 分析行业利润率、成本、竞争强度、盈利能力等
Summary:综合评估（150字以内）- 综合四个维度，给出行业景气度整体评估和投资建议

{industry_info}
请开始分析：
{file_content}
"""


async def gen_industry_prosperity_analysis(file_path: str, industry_name: str = None):
    """
    行业景气度分析。
    Args:
        file_path (str): 文件路径（本地路径或URL）。
        industry_name (str): 行业名称（可选）。
    Returns:
        dict: {
            "demand": str,
            "price": str,
            "supply": str,
            "profitability": str,
            "summary": str
        }
    """
    logger = utils.locator.get_project_logger()

    try:
        # 处理文件路径或URL
        if file_path.startswith("http://") or file_path.startswith("https://"):
            logger.info(f"正在下载文件: {file_path}")
            file_content = await asyncio.to_thread(utils.download_network_file, file_path)
        else:
            logger.info(f"正在解析本地文件: {file_path}")
            # 检查文件是否存在
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"文件不存在: {file_path}")
            file_content = utils.parse_file_to_text(file_path)

        # 构建行业信息提示词
        industry_info = f"行业: {industry_name}\n" if industry_name else ""

        # 调用LLM进行分析
        llmClient = utils.locator.get_agents()
        messages = [
            {
                "role": "user",
                "content": INDUSTRY_PROSPERITY_ANALYSIS_PROMPT_TEMPLATE.format(
                    industry_info=industry_info,
                    file_content=file_content
                ),
            }
        ]

        logger.info(f"正在分析行业景气度 {industry_name or ''}...")
        # 使用 asyncio.to_thread 将同步调用改为异步，避免阻塞
        responseText = await asyncio.to_thread(llmClient.think, cast(List, messages))

        if responseText:
            logger.info("\n\n--- 完整模型响应 ---")
            logger.info(responseText)

            # 定义正则表达式来提取四维度和总结
            pattern = r"Demand:\s*(.*?)\nPrice:\s*(.*?)\nSupply:\s*(.*?)\nProfitability:\s*(.*?)\nSummary:\s*(.*?)$"

            # 执行匹配（re.DOTALL让.匹配换行符）
            result = re.search(pattern, responseText, re.DOTALL)
            if not result:
                logger.warning("未匹配到四维度分析结果")
                # 返回原始响应作为摘要
                return {
                    "demand": "",
                    "price": "",
                    "supply": "",
                    "profitability": "",
                    "summary": responseText[:500]  # 取前500字
                }

            demand = result.group(1).strip()
            price = result.group(2).strip()
            supply = result.group(3).strip()
            profitability = result.group(4).strip()
            summary = result.group(5).strip()

            logger.info("-----------------")
            logger.info(f"需求信号: {demand[:100]}...")
            logger.info(f"价格信号: {price[:100]}...")
            logger.info(f"供给信号: {supply[:100]}...")
            logger.info(f"盈利信号: {profitability[:100]}...")
            logger.info(f"综合评估: {summary[:100]}...")
            logger.info("-----------------")

            return {
                "demand": demand,
                "price": price,
                "supply": supply,
                "profitability": profitability,
                "summary": summary
            }
    except Exception as e:
        logger.error(f"行业景气度分析失败: {e}")
        raise
