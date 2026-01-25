import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  datasource: {
    url: env("DATABASE_URL"), // 从.env读取，无需改这里
  },
})