import logging
from logging.handlers import RotatingFileHandler
import os


def init_logger(logger_name="project", log_level=logging.DEBUG):
    """初始化日志器"""
    # 创建日志器
    logger = logging.getLogger(logger_name)
    logger.setLevel(log_level)
    # 清除默认处理器，防止重复输出
    if logger.handlers:
        logger.handlers.clear()

    # 确保日志目录存在
    log_dir = os.path.join(os.path.dirname(__file__), "../logs")
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    log_file = os.path.join(log_dir, f"{logger_name}.log")

    # 1. 文件处理器：按大小分割
    file_handler = RotatingFileHandler(
        log_file, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    file_handler.setLevel(logging.DEBUG)

    # 2. 控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)

    # 日志格式：时间 - 日志器 - 级别 - 文件名:行号 - 信息
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    # 添加处理器
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger
