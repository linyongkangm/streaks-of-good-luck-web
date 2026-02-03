from math import nan
import math
import akshare as ak
from fastapi.encoders import jsonable_encoder


def call_akshare(method: str, **kwargs):
    # 临时返回，避免报错
    # 使用 getattr 动态获取 akshare 模块的方法
    if not hasattr(ak, method):
        raise AttributeError(f"akshare 模块没有 '{method}' 方法")
    func = getattr(ak, method)
    result = func(**kwargs)
    return jsonable_encoder(
        obj=result.to_dict("records"),
        custom_encoder={
            float: lambda x: (
                None
                if (x != x or x == float("inf") or x == float("-inf") or math.isnan(x))
                else x
            )
        },
    )
