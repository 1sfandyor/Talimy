export type PermifyClientConfig = {
  endpoint: string
  cert: Buffer | null
  pk: Buffer | null
  certChain: Buffer | null
  insecure: boolean | null
}

export type PermifyPermissionCheckRequest = {
  tenantId: string
  metadata: {
    snapToken: string
    schemaVersion: string
    depth: number
  }
  entity: {
    type: string
    id: string
  }
  permission: string
  subject: {
    type: string
    id: string
    relation: string
  }
  context: {
    tuples: []
    attributes: []
    data: Record<string, unknown>
  }
  arguments: []
}

export type PermifyPermissionCheckResponse = {
  can: number
}

export type PermifyClient = {
  permission: {
    check(request: PermifyPermissionCheckRequest): Promise<PermifyPermissionCheckResponse>
  }
}

type PermifySdkModule = {
  grpc: {
    newClient(config: PermifyClientConfig): PermifyClient
    base: {
      CheckResult: {
        CHECK_RESULT_ALLOWED: number
        CHECK_RESULT_DENIED: number
      }
    }
  }
}

const permifySdk = require("@permify/permify-node") as PermifySdkModule

export const PERMIFY_CHECK_RESULT = permifySdk.grpc.base.CheckResult

export function createPermifyClient(config: PermifyClientConfig): PermifyClient {
  return permifySdk.grpc.newClient(config)
}
