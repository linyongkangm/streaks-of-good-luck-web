# Lib package
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, TypeVar, ParamSpec, Optional
from pathlib import Path
import os
import requests
import PyPDF2
import asyncio
from datetime import datetime, date
from bs4 import BeautifulSoup

from . import locator as locator

THREAD_POOL = ThreadPoolExecutor(max_workers=5)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


# P：捕获 func 的参数类型（任意参数列表）
P = ParamSpec("P")
# R：捕获 func 的返回类型
R = TypeVar("R")


async def to_async_fetch(fetch: Callable[P, R], *argv: P.args) -> R:  # type: ignore
    # 获取事件循环
    loop = asyncio.get_running_loop()
    # 在线程池中运行同步函数，返回协程对象
    result = await loop.run_in_executor(THREAD_POOL, fetch, *argv)  # type: ignore
    return result


def str_to_date(time_str: str) -> Optional[date]:
    """
    将2025、2025-06、2025-06-01格式的字符串转为date类型
    :param time_str: 输入的时间字符串（仅支持上述三种合法格式）
    :return: 转换后的date对象，格式非法返回None
    """
    # 去除首尾空白符，避免格式干扰
    time_str = time_str.strip()
    # 按分隔符'-'拆分，判断格式类型
    parts = time_str.split("-")

    try:
        if len(parts) == 1:
            # 格式1：仅年份（如2025），补月=01、日=01
            date_obj = datetime.strptime(time_str, "%Y").date()
        elif len(parts) == 2:
            # 格式2：年-月（如2025-06），补日=01
            date_obj = datetime.strptime(time_str, "%Y-%m").date()
        elif len(parts) == 3:
            # 格式3：年-月-日（如2025-06-01），直接解析
            date_obj = datetime.strptime(time_str, "%Y-%m-%d").date()
        else:
            print(
                f"格式错误：{time_str} 不是合法的时间格式（仅支持2025、2025-06、2025-06-01）"
            )
            return None
        return date_obj
    except ValueError as e:
        # 捕获非法值异常（如2025-13、2025-02-30等）
        print(f"时间值非法：{time_str}，错误信息：{e}")
        return None


# -------------------------- 工具函数1：下载网络文件到本地 --------------------------
def download_network_file(web_file_url: str, save_path="analysis") -> str:
    """
    下载网络文件到本地临时目录
    :param web_file_url: 网络文件的公开直链（必填，无登录/权限限制）
    :param save_path: 本地临时保存目录（默认analysis，自动创建）
    :return: 本地文件的完整路径
    """
    # 创建临时目录（不存在则自动创建）
    Path(save_path).mkdir(exist_ok=True)
    # 提取网络文件的原始文件名（如https://xxx/白皮书.pdf → 白皮书.pdf）
    current_local_time = datetime.now().strftime("%Y%m%d%H%M%S")
    file_name = web_file_url.split("/")[-1].split("?")[
        0
    ]  # 过滤链接后的参数（如?token=123）
    local_file_path = os.path.join(save_path, current_local_time + "_" + file_name)

    # 发送请求下载文件（添加超时和重连，避免下载失败）
    try:
        response = requests.get(web_file_url, stream=True, timeout=30)
        response.raise_for_status()  # 若链接无效（404/500），抛出异常
        # 分块写入文件（支持大文件）
        with open(local_file_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"网络文件下载成功，保存路径：{local_file_path}")
        return local_file_path
    except Exception as e:
        raise Exception(
            f"文件下载失败：{str(e)}（请检查链接是否为公开直链，无登录限制）"
        )


# -------------------------- 工具函数2：解析本地文件为纯文本（支持PDF/Word/纯文本） --------------------------
def parse_file_to_text(local_file_path: str):
    """
    解析不同格式文件为纯文本，供AI分析
    :param local_file_path: 本地文件完整路径
    :return: 解析后的纯文本内容
    """
    file_suffix = os.path.splitext(local_file_path)[
        1
    ].lower()  # 获取文件后缀（小写，避免大小写问题）
    text_content = ""

    # 解析PDF文件
    if file_suffix == ".pdf":
        with open(local_file_path, "rb") as f:
            pdf_reader = PyPDF2.PdfReader(f)
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:  # 过滤空页
                    text_content += page_text + "\n"
    # 解析Word(.docx)文件（不支持.doc旧格式，可转换为docx后再解析）
    # elif file_suffix == ".docx":
    #     doc = docx.Document(local_file_path)
    #     for paragraph in doc.paragraphs:
    #         if paragraph.text.strip():  # 过滤空行
    #             text_content += paragraph.text + "\n"
    # 解析纯文本文件（.txt/.md等）
    elif file_suffix in [".txt", ".md", ".csv"]:
        with open(local_file_path, "r", encoding="utf-8", errors="ignore") as f:
            text_content = f.read()
    else:
        raise Exception(
            f"暂不支持解析该格式文件：{file_suffix}，目前支持PDF/Word(.docx)/TXT/MD"
        )

    if not text_content:
        raise Exception("文件解析后无文本内容（若为扫描版PDF，需先做OCR识别）")
    print(f"文件解析成功，共提取 {len(text_content)} 个字符")
    return text_content


def get_page_text(url: str):
    # 1. 发送GET请求获取网页内容（timeout设置超时，防止无限等待）
    response = requests.get(url=url, headers=HEADERS, timeout=10)

    # 2. 严格校验请求是否成功（非200状态码直接抛出异常）
    response.raise_for_status()

    # 3. 手动指定编码（解决部分网页中文乱码问题，核心优化点）
    # 优先用网页响应头的编码，若无则手动指定（如utf-8/gbk）
    response.encoding = response.apparent_encoding or "utf-8"

    # 4. 解析网页内容：BeautifulSoup指定解析器（lxml更高效，Python内置html.parser也可）
    soup = BeautifulSoup(response.text, "html.parser")  # 无需额外安装，兼容性好
    # soup = BeautifulSoup(response.text, "lxml")  # 需安装：pip install lxml，解析速度更快

    # 5. 提取核心内容（示例：提取页面所有标题、纯文本、指定标签内容）
    # 5.1 提取页面<title>标签内容（网页标题）
    page_title = soup.title.string if soup.title else "无标题"
    print(f"网页标题：{page_title}\n")

    # 5.2 提取页面所有纯文本（去除HTML标签，保留文字）
    page_text = soup.get_text(
        strip=True, separator="\n"
    )  # strip去空格，separator分隔换行
    print("网页纯文本内容（前50字）：")
    print(page_text[:50], "...\n")
    return {"title": page_title, "text": page_text}


def is_basic_numeric_type(value) -> bool:
    """判断是否为基础数字类型（int/float/Decimal）"""
    return isinstance(value, (int, float, Decimal))
