import akshare as ak


def call_akshare(method: str, **kwargs):
    # 使用 getattr 动态获取 akshare 模块的方法
    if not hasattr(ak, method):
        raise AttributeError(f"akshare 模块没有 '{method}' 方法")
    func = getattr(ak, method)
    result = func(**kwargs)
    return result.to_dict("records")
