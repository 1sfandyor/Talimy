declare module "dotenv" {
  export type DotenvConfigOptions = {
    path?: string
    override?: boolean
  }

  export function config(options?: DotenvConfigOptions): {
    parsed?: Record<string, string>
    error?: Error
  }
}

declare module "pg" {
  export type PoolConfig = {
    connectionString?: string
    ssl?: boolean | { rejectUnauthorized?: boolean }
  }

  export class Pool {
    constructor(config?: PoolConfig)
  }
}
