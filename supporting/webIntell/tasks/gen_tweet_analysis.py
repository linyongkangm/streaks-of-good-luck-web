import utils
from typing import cast, List
import re

# Tweet Analysis 提示词模板
TWEET_ANALYSIS_PROMPT_TEMPLATE = """
请注意，你是一名优秀的推文分析助手，负责分析和总结每日的推文内容.


请严格按照以下格式用中文进行回应:

Date:yyyy-mm-dd
Summary:每日推文总结


现在，请开始总结每日推文的主要内容:
Tweets: {tweets}

"""


async def gen_tweet_analysis(tweet_infos: list):
    """
    推文分析。
    Args:
        tweet_infos (list): 推文信息列表。
    Returns:
        dict: {"date": str, "summary": str}
    """
    logger = utils.locator.get_project_logger()
    logger.info(f"共 {len(tweet_infos)} 条推文")
    if len(tweet_infos) == 0:
        return

    tweets = "\n".join(
        [
            f"[{tweet.tweet_date} {tweet.user_name} {tweet.tweet_from} {tweet.tweet_text}]"
            for tweet in tweet_infos
        ]
    )
    try:
        agents = utils.locator.get_agents()
        messages = [
            {
                "role": "user",
                "content": TWEET_ANALYSIS_PROMPT_TEMPLATE.format(tweets=tweets),
            }
        ]
        responseText = agents.think(cast(List, messages))
        if responseText:
            logger.info("\n\n--- 完整模型响应 ---")
            logger.info(responseText)
            # 定义正则表达式（与上文一致）
            pattern = r"^Date:\s*(\d{4}-\d{2}-\d{2})\s*\nSummary:\s*(.*?)\s*$"

            # 执行匹配（re.DOTALL让.匹配换行符，适配摘要中的换行）
            result = re.match(pattern, responseText, re.DOTALL)
            if not result:
                logger.info("未匹配到日期和总结")
                return
            summary_date = result.group(1)  # 捕获组1：Date值
            summary = result.group(2)  # 捕获组2：Summary值
            return {
                "date": summary_date,
                "summary": summary,
            }
        else:
            logger.warning("模型未返回任何响应")
    except ValueError as e:
        logger.error(e)
