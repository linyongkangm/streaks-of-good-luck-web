import asyncio
import re
from typing import List, cast

import utils

MILESTONE_KEYWORD_PROMPT_TEMPLATE = """
你是一名中文信息抽取助手。

请根据以下输入，提取一个“里程碑关键词”：
- 必须是 2 到 8 个中文汉字
- 只输出最核心的短语，不要解释
- 不要标点、空格、英文、数字

请严格按下面格式输出：
Keyword:关键词

输入：
Title: {title}
Description: {description}
"""


def _sanitize_keyword(keyword: str, fallback_text: str) -> str:
    chinese_chars = re.findall(r"[\u4e00-\u9fff]", keyword or "")
    normalized = "".join(chinese_chars)

    if len(normalized) >= 2:
        return normalized[:8]

    fallback_chars = re.findall(r"[\u4e00-\u9fff]", fallback_text or "")
    fallback = "".join(fallback_chars)
    if len(fallback) >= 2:
        return fallback[:8]

    if len(fallback) == 1:
        return fallback + "事件"

    return "行业事件"


async def gen_milestone_keyword(title: str, description: str = "") -> str:
    logger = utils.locator.get_project_logger()
    llm_client = utils.locator.get_agents()

    merged_text = f"{title or ''} {description or ''}".strip()
    if not title:
        return _sanitize_keyword("", merged_text)

    messages = [
        {
            "role": "user",
            "content": MILESTONE_KEYWORD_PROMPT_TEMPLATE.format(
                title=title,
                description=description or "",
            ),
        }
    ]

    try:
        response_text = await asyncio.to_thread(llm_client.think, cast(List, messages))
        logger.info(f"LLM response for milestone keyword: {response_text}")
        if not response_text:
            return _sanitize_keyword("", merged_text)

        match = re.search(r"Keyword\s*:\s*(.+)", response_text)
        extracted = match.group(1).strip() if match else response_text.strip()
        keyword = _sanitize_keyword(extracted, merged_text)

        logger.info(f"Milestone keyword extracted: {keyword}")
        return keyword
    except Exception as error:
        logger.error(f"Failed to extract milestone keyword: {error}")
        return _sanitize_keyword("", merged_text)
