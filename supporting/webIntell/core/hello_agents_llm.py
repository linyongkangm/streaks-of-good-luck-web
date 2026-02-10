from datetime import date
import json
import os
from openai import APIError, OpenAI
from openai.types.chat import ChatCompletionMessageParam
from typing import List, Optional
import utils


class HelloAgentsLLM:
    """
    为本书 "Hello Agents" 定制的LLM客户端。
    它用于调用任何兼容OpenAI接口的服务，并默认使用流式响应。
    """

    model: Optional[str]
    client: OpenAI

    def __init__(
        self,
        model: Optional[str] = None,
        apiKey: Optional[str] = None,
        baseUrl: Optional[str] = None,
        timeout: Optional[int] = None,
    ):
        """
        初始化客户端。优先使用传入参数，如果未提供，则从环境变量加载。
        """

        self.model = model
        if not self.model:
            self.shiftModel(0)

        if not all([self.model, apiKey, baseUrl]):
            raise ValueError("模型ID、API密钥和服务地址必须被提供。")

        self.client = OpenAI(api_key=apiKey, base_url=baseUrl, timeout=timeout)

    def shiftModel(self, offset: int = 1):
        """切换模型ID"""
        logger = utils.locator.get_project_logger()
        config_path = os.path.join(
            os.getcwd(), "supporting/webIntell/core/.date.config.json"
        )
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
        nowDate = date.today().strftime("%Y-%m-%d")
        if config.get("date") != nowDate:
            config["date"] = nowDate
            config["llm_model_id_index"] = 0
        else:
            config["llm_model_id_index"] += offset
        model_ids = os.getenv("LLM_MODEL_ID", "").split(",")
        model_id = model_ids[config["llm_model_id_index"]]
        logger.info(f"切换LLM模型为第 {config['llm_model_id_index']} 个：{model_id}")
        open(config_path, "w", encoding="utf-8").write(
            json.dumps(config, ensure_ascii=False, indent=2)
        )
        self.model = model_id

    def think(
        self, messages: List[ChatCompletionMessageParam], temperature: float = 0
    ) -> str:
        if not self.model:
            raise ValueError("模型ID未设置，无法调用LLM。")
        """
        调用大语言模型进行思考，并返回其响应。
        """
        logger = utils.locator.get_project_logger()
        logger.info(f"🧠 正在调用 {self.model} 模型...")
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                stream=True,
            )

            # 处理流式响应
            collected_content = []
            for chunk in response:
                content = chunk.choices[0].delta.content or ""
                if content != "":
                    collected_content.append(content)
            return "".join(collected_content)

        except APIError as e:
            logger.error(f"❌ 调用LLM API时发生错误: {e}")
            if "You have exceeded today's quota" in e.message:
                self.shiftModel(1)
                return self.think(messages, temperature)
            raise ValueError("调用LLM API时发生错误，请检查配置和网络连接。") from e
