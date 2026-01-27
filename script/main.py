import asyncio
from datetime import datetime, date
import click
import tasks

# from tasks import (
#     add_companies,
#     associate_board_to_companies,
#     add_company_finance_indicators,
#     store_tweet_from_file,
#     gen_tweet_analysis,
#     store_qiushi_from_file,
# )


@click.group()
def cli():
    """Streaks of Good Luck - 数据管理工具"""
    pass


# @cli.command()
# @click.argument('codes', nargs=-1, required=True)
# def add_company(codes):
#     """添加公司信息

#     示例: python main.py add-company 601988 000001
#     """
#     asyncio.run(add_companies(list(codes)))
#     click.echo(f"✓ 成功添加 {len(codes)} 家公司")


# @cli.command()
# @click.argument('board_id', type=int)
# @click.argument('company_weights', type=str)
# def associate_board(board_id, company_weights):
#     """关联板块和公司

#     示例: python main.py associate-board 1 "14:0.5,15:0.3"
#     """
#     # 解析公司权重字符串，格式: "14:0.5,15:0.3"
#     weights = {}
#     for item in company_weights.split(','):
#         company_id, weight = item.split(':')
#         weights[int(company_id)] = float(weight)

#     asyncio.run(associate_board_to_companies(board_id, weights))
#     click.echo(f"✓ 成功关联板块 {board_id} 和 {len(weights)} 家公司")


# @cli.command()
# @click.argument('company_id', type=int)
# @click.option('--start-date', default=None, help='开始日期 (YYYY-MM-DD)')
# def add_finance_indicators(company_id, start_date):
#     """添加公司财报指标数据

#     示例: python main.py add-finance-indicators 14 --start-date 2023-01-01
#     """
#     start = datetime.strptime(start_date, '%Y-%m-%d').date() if start_date else date(2023, 1, 1)
#     asyncio.run(add_company_finance_indicators(company_id=company_id, start_date=start))
#     click.echo(f"✓ 成功添加公司 {company_id} 的财报指标数据")


# @cli.command()
# def store_tweet():
#     """存储推特数据

#     示例: python main.py store-tweet
#     """
#     asyncio.run(store_tweet_from_file())
#     click.echo("✓ 成功存储推特数据")


# @cli.command()
# def store_qiushi():
#     """存储求是数据

#     示例: python main.py store-qiushi
#     """
#     asyncio.run(store_qiushi_from_file())
#     click.echo("✓ 成功存储求是数据")


@cli.command()
def test():
    """测试命令
    示例: python main.py test
    """
    asyncio.run(tasks.test())
    click.echo("✓ 成功执行测试命令")


if __name__ == "__main__":
    cli()
