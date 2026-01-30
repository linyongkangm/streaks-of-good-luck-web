from dotenv import load_dotenv
from core import HelloAgentsLLM
from typing import Callable, TypeVar, ParamSpec
import os

from core.log_config import init_logger

# 加载位于项目根目录的 .env 文件)
load_dotenv(os.path.join(os.getcwd(), ".env"))

# P：捕获 func 的参数类型（任意参数列表）
P = ParamSpec("P")
# R：捕获 func 的返回类型
R = TypeVar("R")


def singleton_get(get_func: Callable[P, R]) -> Callable[P, R]:
    instance = None

    def inner(*args: P.args, **kwargs: P.kwargs) -> R:
        nonlocal instance
        if instance is None:
            instance = get_func(*args, **kwargs)
        return instance

    return inner


get_agents = singleton_get(
    lambda: HelloAgentsLLM(
        apiKey=os.getenv("LLM_API_KEY"),
        baseUrl=os.getenv("LLM_BASE_URL"),
        timeout=int(os.getenv("LLM_TIMEOUT", 60)),
    )
)


get_project_logger = singleton_get(
    lambda: init_logger("project")
)

__all__ = ["get_agents", "get_project_logger"]