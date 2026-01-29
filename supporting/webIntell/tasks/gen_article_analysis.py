import utils
from typing import cast, List
import re

# ARTICLE_SUMMARY 提示词模板
ARTICLE_SUMMARY_PROMPT_TEMPLATE = """
请注意，你是一名优秀的文章总结助手，负责分析和总结文章内容。


请严格按照以下格式进行回应:

Tags:文章标签，多个标签用逗号分隔
Summary:文章总结



现在，请开始总结文章的主要内容:
Article: {article}
"""


async def gen_article_analysis(source_text: str):
    """
    文章分析。
    Args:
        source_text (str): 文章源文本。
    Returns:
        dict: {"tags": str, "summary": str}
    """
    logger = utils.locator.get_project_logger()

    try:
        llmClient = utils.locator.get_agents()
        messages = [
            {
                "role": "user",
                "content": ARTICLE_SUMMARY_PROMPT_TEMPLATE.format(article=source_text),
            }
        ]
        responseText = llmClient.think(cast(List, messages))
        if responseText:
            print("\n\n--- 完整模型响应 ---")
            print(responseText)
            # 定义正则表达式（与上文一致）
            pattern = r"^Tags:\s*(.*?)\s*\nSummary:\s*(.*?)\s*$"

            # 执行匹配（re.DOTALL让.匹配换行符，适配摘要中的换行）
            result = re.match(pattern, responseText, re.DOTALL)
            if not result:
                print("未匹配到标签和总结")
                return
            tags = result.group(1)  # 捕获组1：Date值
            summary = result.group(2)  # 捕获组2：Summary值
            print("-----------------")
            print(f"标签: {tags}")
            print(f"总结: {summary}")
            print("-----------------")
            return {"tags": tags, "summary": summary}
    except ValueError as e:
        print(e)
