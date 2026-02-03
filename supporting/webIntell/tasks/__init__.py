# Tasks package
import utils
from .gen_tweet_analysis import gen_tweet_analysis as gen_tweet_analysis
from .gen_article_analysis import gen_article_analysis as gen_article_analysis
from .gen_predicts import gen_predicts as gen_predicts
from .call_akshare import call_akshare as call_akshare

def test():
    """测试命令
    示例: python main.py test
    """
    project_logger = utils.locator.get_project_logger()
    print(call_akshare('stock_individual_info_em', symbol="000001"))
    project_logger.info("测试命令执行成功")
