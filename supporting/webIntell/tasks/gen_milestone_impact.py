import asyncio
import re
from typing import List, cast

import utils

MILESTONE_IMPACT_PROMPT_TEMPLATE = """
你是一名行业分析专家。

请根据以下信息，判断该里程碑事件对所关联行业/公司的影响程度：
- 请从以下5个等级中选择一个：超正面、正面、中性、负面、超负面
- 只返回一个等级，不要解释
- 考虑该事件的长期影响、市场反应、政策导向等因素

请严格按下面格式输出：
Impact:等级

输入：
Title: {title}
Description: {description}
Context: {context}
"""


def _normalize_impact(impact_str: str) -> str:
    """Normalize impact string to one of the valid values."""
    impact = (impact_str or "").strip()
    
    # Extract Chinese characters only
    chinese = re.findall(r"[\u4e00-\u9fff]+", impact)
    if chinese:
        impact = "".join(chinese)
    
    # Map to valid impact levels
    valid_impacts = ["超正面", "正面", "中性", "负面", "超负面"]
    
    # Direct match
    if impact in valid_impacts:
        return impact
    
    # Partial match
    for valid in valid_impacts:
        if valid in impact:
            return valid
    
    # Default to neutral
    return "中性"


async def gen_milestone_impact(title: str, description: str = "", context: str = "") -> str:
    logger = utils.locator.get_project_logger()
    llm_client = utils.locator.get_agents()

    if not title:
        return "中性"

    messages = [
        {
            "role": "user",
            "content": MILESTONE_IMPACT_PROMPT_TEMPLATE.format(
                title=title,
                description=description or "",
                context=context or "",
            ),
        }
    ]

    try:
        response_text = await asyncio.to_thread(llm_client.think, cast(List, messages))
        logger.info(f"LLM response for milestone impact: {response_text}")
        
        if not response_text:
            return "中性"

        # Extract impact from response
        match = re.search(r"Impact\s*:\s*(.+)", response_text)
        extracted = match.group(1).strip() if match else response_text.strip()
        impact = _normalize_impact(extracted)

        logger.info(f"Milestone impact: {impact}")
        return impact
    except Exception as error:
        logger.error(f"Failed to extract milestone impact: {error}")
        return "中性"
