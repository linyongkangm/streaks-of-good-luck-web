import datetime
from email import message
import utils
from typing import cast, List
import json
import re

# 预测提取提示词模板
PREDICT_EXTRACTION_PROMPT_TEMPLATE = """
请注意，你是一名优秀的内容分析助手，负责从文章中提取所有的预测信息。

预测是指对未来某个时间段内会发生的事件的判断或推断。请仔细阅读文章，识别出所有明确或隐含的预测。

对于每个预测，请提取以下信息：
- interval_start: 预测时间区间的开始日期（格式：YYYY-MM-DD）
- interval_end: 预测时间区间的结束日期（格式：YYYY-MM-DD）
- content: 预测的具体内容（简洁明了地描述预测的核心内容）

请严格按照以下 JSON 格式回应（不要添加任何额外的说明文字）:

```json
[
  {{
    "interval_start": "YYYY-MM-DD",
    "interval_end": "YYYY-MM-DD",
    "content": "预测内容描述"
  }}
]
```

注意事项：
1. 如果文章中没有明确的时间，请根据上下文合理推断
2. 如果只有一个时间点，interval_start 和 interval_end 可以相同
3. 内容应该简洁准确，提取预测的核心要点
4. 如果文章中没有任何预测，返回空数组 []
5. 现在是 {current_date}
现在，请分析以下文章内容：

{article_text}
"""


async def gen_predicts(article_text: str):
    """
    从文章中提取预测信息。
    Args:
        article_text (str): 文章文本内容。
    Returns:
        list: [{"interval_start": str, "interval_end": str, "content": str}]
    """
    logger = utils.locator.get_project_logger()
    logger.info(f"开始分析文章提取预测，文章长度：{len(article_text)}")

    if not article_text or len(article_text.strip()) == 0:
        logger.warning("文章内容为空")
        return []

    try:
        agents = utils.locator.get_agents()
        messages = [
            {
                "role": "user",
                "content": PREDICT_EXTRACTION_PROMPT_TEMPLATE.format(
                    article_text=article_text,
                    current_date=datetime.date.today().strftime("%Y-%m-%d"),
                ),
            }
        ]
        logger.info("\n\n--- 发送给模型的消息 ---", messages)
        responseText = agents.think(cast(List, messages))

        if responseText:
            logger.info("\n\n--- 完整模型响应 ---")
            logger.info(responseText)

            # 尝试提取 JSON 内容（可能包含在 markdown 代码块中）
            json_match = re.search(r"```json\s*([\s\S]*?)\s*```", responseText)
            if json_match:
                json_text = json_match.group(1)
            else:
                # 如果没有 markdown 代码块，尝试直接解析
                json_text = responseText.strip()

            # 解析 JSON
            try:
                predicts = json.loads(json_text)

                if not isinstance(predicts, list):
                    logger.warning("响应不是数组格式")
                    return []

                # 验证每个预测的格式
                valid_predicts = []
                for predict in predicts:
                    if (
                        isinstance(predict, dict)
                        and "interval_start" in predict
                        and "interval_end" in predict
                        and "content" in predict
                    ):
                        valid_predicts.append(
                            {
                                "interval_start": predict["interval_start"],
                                "interval_end": predict["interval_end"],
                                "content": predict["content"],
                            }
                        )
                    else:
                        logger.warning(f"预测格式不正确，跳过：{predict}")

                logger.info(f"✓ 成功提取 {len(valid_predicts)} 个预测")
                return valid_predicts

            except json.JSONDecodeError as e:
                logger.error(f"JSON 解析失败：{e}")
                logger.error(f"响应内容：{json_text}")
                return []
        else:
            logger.warning("模型未返回任何响应")
            return []

    except Exception as e:
        logger.error(f"提取预测失败：{e}")
        import traceback

        logger.error(traceback.format_exc())
        return []
