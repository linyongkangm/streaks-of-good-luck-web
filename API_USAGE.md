# Streaks of Good Luck - 使用指南

## 架构说明

该项目采用分布式架构处理推文分析：
- **Next.js 应用**：Web 服务器，负责数据库查询和 API 协调
- **Python API 服务器**：FastAPI 驱动的分析引擎，负责 AI 推文分析逻辑

## 数据流程

```
批量插入推文
    ↓
[Next.js route.ts] 批量创建推文到数据库
    ↓
识别新推文的日期和来源
    ↓
[Next.js route.ts] 查询该日期该来源的全部推文
    ↓
[Next.js route.ts] 调用 Python API /analyze-tweet，传递 tweet_infos
    ↓
[Python main.py] 接收 tweet_infos，调用 AI 分析，返回结果
    ↓
[Next.js route.ts] 接收分析结果，保存到 summary__tweet 表
```

## 职责划分

| 组件 | 职责 |
|------|------|
| **Next.js (route.ts)** | 数据库查询、数据格式转换、API 协调、**保存分析结果** |
| **Python API (main.py)** | AI 推文分析、**纯计算逻辑**，不访问数据库 |

## 安装与配置

### 1. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```bash
# Python API 服务器地址
PYTHON_API_URL=http://127.0.0.1:8000

# 数据库连接（Prisma）
DATABASE_URL=mysql://user:password@localhost:3306/streaks_of_good_luck
```

### 2. 安装 Python 依赖

```bash
cd script
pip install -r requirements.txt
```

### 3. 安装 Node.js 依赖

```bash
pnpm install
```

## 运行方式

### 方式 1：启动 Python API 服务器

```bash
cd script
python main.py server --host 0.0.0.0 --port 8000
```

服务器启动后：
- API 文档：http://127.0.0.1:8000/docs
- 健康检查：GET http://127.0.0.1:8000/health
- 推文分析：POST http://127.0.0.1:8000/analyze-tweet

### 方式 2：启动 Next.js Web 应用

```bash
pnpm dev
```

应用启动后访问 http://localhost:3000

### 方式 3：CLI 直接执行

```bash
cd script
python main.py analyze-tweet --file "path/to/tweets.json"
```

## API 端点

### POST /analyze-tweet

推文分析接口

**请求体：**
```json
{
  "collect_from": "twitter",
  "date": "2024-01-27",
  "tweet_infos": [
    {
      "tweet_date": "2024-01-27",
      "user_name": "john_doe",
      "tweet_from": "twitter",
      "tweet_text": "This is a tweet"
    }
  ]
}
```

**响应：**
```json
{
  "success": true,
  "message": "Successfully analyzed 10 tweets",
  "collect_from": "twitter",
  "date": "2024-01-27",
  "tweet_count": 10,
  "analysis": {
    "date": "2024-01-27",
    "summary": "今日推文总结..."
  }
}
```

**说明：**
- `tweet_infos` 由 Next.js 从数据库查询获取
- Python API 接收 tweet_infos，**仅进行 AI 分析**，不访问数据库
- Python API 返回分析结果给 Next.js
- **Next.js 负责保存分析结果** 到 `summary__tweet` 表
- 使用 Prisma `upsert` 自动处理插入和更新

## 数据库表

### summary__tweet

推文分析摘要表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UnsignedInt | 主键 |
| collect_from | VarChar(128) | 推文来源 |
| date | Date | 分析日期 |
| summary | Text | 摘要内容 |
| create_time | DateTime | 创建时间 |
| update_time | DateTime | 更新时间 |

唯一索引：`(collect_from, date)`

## 工作流程详解

### 批量创建推文（Web 接口）

1. **调用批量创建接口**：`POST /api/batch-create-tweets`
   
2. **Next.js 处理流程**：
   - 检查推文是否已存在
   - 批量插入新推文到 `info__tweet` 表
   - 识别新推文所属的日期和来源
   - 按日期和来源分组

3. **查询全部推文**：对每个日期+来源组合
   - 从数据库查询该日期该来源的 **所有推文**（不仅仅是新插入的）
   - 转换为 `tweet_infos` 列表

4. **调用 Python API**：`POST /analyze-tweet`
   - 传递 `collect_from`、`date` 和 `tweet_infos`
   - Python API **仅进行 AI 分析**

5. **保存分析结果**：Next.js 接收结果后
   - 使用 Prisma `upsert` 保存或更新到 `summary__tweet` 表
   - 确保 `(collect_from, date)` 组合唯一

### 推文分析（Python API）

1. **接收请求参数**：`collect_from`、`date` 和 `tweet_infos`
2. **转换数据格式**：将 tweet_infos 转换为推文对象
3. **调用 AI 模型**：`gen_tweet_analysis()` 生成分析摘要
4. **返回结果**：将分析结果返回给 Next.js（**不保存到数据库**）

## 注意事项

- Python API 服务器需要始终运行（在后台或通过进程管理器）
- 确保 `PYTHON_API_URL` 环境变量正确配置
- **Python API 不访问数据库**，只负责 AI 分析逻辑
- **Next.js 负责所有数据库操作**，包括查询和保存
- Next.js 使用 Prisma `upsert` 自动处理插入和更新逻辑
- 数据库 `summary__tweet` 表的 `collect_from` 和 `date` 组合必须唯一
