# Tasks package
import utils
import asyncio


async def test():
    """测试命令
    示例: python main.py test
    """
    project_logger = utils.locator.get_project_logger()
    project_logger.info("测试命令执行sleep 1s")
    await asyncio.sleep(1)
    project_logger.info("测试命令执行成功")
