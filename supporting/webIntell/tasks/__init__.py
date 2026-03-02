# Tasks package
from anyio import sleep
import utils
from .gen_tweet_analysis import gen_tweet_analysis as gen_tweet_analysis
from .gen_article_analysis import gen_article_analysis as gen_article_analysis
from .gen_predicts import gen_predicts as gen_predicts
from .gen_milestone_keyword import gen_milestone_keyword as gen_milestone_keyword
from .gen_milestone_impact import gen_milestone_impact as gen_milestone_impact
from .call_akshare import call_akshare as call_akshare

async def test():
    """测试命令
    示例: python main.py test
    """
    project_logger = utils.locator.get_project_logger()
    project_logger.info("开始测试命令执行 ...")
    await sleep(20)  # 模拟一些异步操作
    project_logger.info("测试命令执行成功")
