# 使用说明

## 配置步骤

1. **配置数据库连接**
   编辑 `.env` 文件，设置你的 MySQL 数据库连接信息：
   ```
   DATABASE_URL="mysql://用户名:密码@localhost:3306/数据库名"
   ```

2. **生成 Prisma 客户端**
   ```bash
   pnpm prisma generate
   ```

3. **拉去数据库表**
   ```bash
   pnpm prisma db pull
   ```

## API 端点


## Prisma 常用命令

- `pnpm prisma generate` - 生成 Prisma 客户端
- `pnpm prisma db pull` - 将数据库同步到本地模型（开发环境）
- `pnpm prisma db push` - 将模型同步到数据库（开发环境）
- `pnpm prisma migrate dev` - 创建迁移文件（生产环境推荐）
- `pnpm prisma studio` - 打开数据库可视化管理界面
- `pnpm prisma db seed` - 填充测试数据
