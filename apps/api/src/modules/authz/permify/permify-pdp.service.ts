import { ForbiddenException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"

import { getPermifyConfig } from "@/config/permify.config"

import {
  createPermifyClient,
  PERMIFY_CHECK_RESULT,
  type PermifyClient,
  type PermifyPermissionCheckResponse,
  type PermifySchemaWriteResponse,
} from "./permify-sdk"
import { PERMIFY_GENDER_SCHEMA } from "./permify-gender-schema"

type GenderEntity = "student" | "teacher"
type GenderAction = "list" | "create" | "update"

type PermifyCheckInput = {
  tenantId: string
  userId: string
  roles: string[]
  userGenderScope: "male" | "female" | "all"
  entity: GenderEntity
  action: GenderAction
  targetGender?: "male" | "female"
}

@Injectable()
export class PermifyPdpService {
  private readonly logger = new Logger(PermifyPdpService.name)
  private readonly cfg = getPermifyConfig()
  private client: PermifyClient | null = null
  private readonly schemaBootstrapByTenant = new Map<string, Promise<void>>()
  private readonly runtimeSchemaVersionByTenant = new Map<string, string>()

  async assertGenderAccess(input: PermifyCheckInput): Promise<void> {
    if (!this.cfg.enabled || !this.cfg.grpcEndpoint) {
      this.failClosed("Permify PDP is not configured")
    }

    try {
      const isPlatformAdmin = input.roles.includes("platform_admin")
      const isSchoolAdmin = input.roles.includes("school_admin")
      const contextualTuples = [
        {
          entity: {
            type: this.toPermifyEntityType(input.entity),
            id: this.toPermifyEntityId(input),
          },
          relation: "tenant",
          subject: {
            type: "tenant",
            id: input.tenantId,
            relation: "",
          },
        },
      ]

      if (isPlatformAdmin) {
        contextualTuples.push({
          entity: { type: "tenant", id: input.tenantId },
          relation: "platform_admin",
          subject: { type: "user", id: input.userId, relation: "" },
        })
      }

      if (isSchoolAdmin) {
        contextualTuples.push({
          entity: { type: "tenant", id: input.tenantId },
          relation: "school_admin",
          subject: { type: "user", id: input.userId, relation: "" },
        })
      }

      const response = await this.checkPermissionWithSchemaFallback(input, contextualTuples)

      if (response.can === PERMIFY_CHECK_RESULT.CHECK_RESULT_ALLOWED) {
        return
      }

      if (response.can === PERMIFY_CHECK_RESULT.CHECK_RESULT_DENIED) {
        throw new ForbiddenException("Authorization policy denied")
      }

      this.failClosed("Permify PDP returned an unknown decision")
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error
      }

      const reason = error instanceof Error ? error.message : "unknown error"
      this.failClosed(`Permify PDP request failed: ${reason}`)
    }
  }

  private getClient(): PermifyClient {
    if (this.client) {
      return this.client
    }

    if (!this.cfg.grpcEndpoint) {
      this.failClosed("Permify gRPC endpoint is missing")
    }

    this.client = createPermifyClient({
      endpoint: this.cfg.grpcEndpoint,
      cert: null,
      pk: null,
      certChain: null,
      insecure: this.cfg.insecure,
    })

    return this.client
  }

  private async checkPermissionWithSchemaFallback(
    input: PermifyCheckInput,
    contextualTuples: Array<{
      entity: { type: string; id: string }
      relation: string
      subject: { type: string; id: string; relation: string }
    }>
  ): Promise<PermifyPermissionCheckResponse> {
    const configuredSchemaVersion =
      this.runtimeSchemaVersionByTenant.get(input.tenantId) ?? this.cfg.schemaVersion ?? ""

    try {
      return await this.checkPermission(input, contextualTuples, configuredSchemaVersion)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      if (this.isSchemaMissingError(reason) || this.isPermissionCheckNotFoundError(reason)) {
        this.logger.warn(`Permify schema missing for tenant ${input.tenantId}; bootstrapping schema`)
        await this.ensureTenantSchema(input.tenantId)
        return this.checkPermission(
          input,
          contextualTuples,
          this.runtimeSchemaVersionByTenant.get(input.tenantId) ?? ""
        )
      }

      if (!configuredSchemaVersion) {
        throw error
      }

      if (!this.shouldRetryWithoutSchemaVersion(reason)) {
        throw error
      }

      this.logger.warn(
        `Permify check retrying without pinned schema version after error: ${reason}`
      )
      try {
        return await this.checkPermission(input, contextualTuples, "")
      } catch (retryError) {
        const retryReason = retryError instanceof Error ? retryError.message : String(retryError)
        if (
          !this.isSchemaMissingError(retryReason) &&
          !this.isPermissionCheckNotFoundError(retryReason)
        ) {
          throw retryError
        }

        this.logger.warn(
          `Permify schema missing after schemaVersion fallback for tenant ${input.tenantId}; bootstrapping schema`
        )
        await this.ensureTenantSchema(input.tenantId)
        return this.checkPermission(
          input,
          contextualTuples,
          this.runtimeSchemaVersionByTenant.get(input.tenantId) ?? ""
        )
      }
    }
  }

  private async checkPermission(
    input: PermifyCheckInput,
    contextualTuples: Array<{
      entity: { type: string; id: string }
      relation: string
      subject: { type: string; id: string; relation: string }
    }>,
    schemaVersion: string
  ): Promise<PermifyPermissionCheckResponse> {
    return this.withTimeout(
      this.getClient().permission.check({
        tenantId: input.tenantId,
        metadata: {
          snapToken: "",
          schemaVersion,
          depth: 20,
        },
        entity: {
          type: this.toPermifyEntityType(input.entity),
          id: this.toPermifyEntityId(input),
        },
        permission: this.toPermifyPermission(input.action),
        subject: {
          type: "user",
          id: input.userId,
          relation: "",
        },
        context: {
          tuples: contextualTuples as [],
          attributes: [],
          data: {
            userGenderScope: input.userGenderScope,
            targetGender: input.targetGender ?? "",
            entity: input.entity,
            action: input.action,
          },
        },
        arguments: [],
      })
    )
  }

  private shouldRetryWithoutSchemaVersion(reason: string): boolean {
    const normalized = reason.toLowerCase()
    return (
      normalized.includes("schema") ||
      normalized.includes("snap") ||
      normalized.includes("not found") ||
      normalized.includes("invalid argument")
    )
  }

  private isSchemaMissingError(reason: string): boolean {
    const normalized = reason.toLowerCase()
    return (
      normalized.includes("error_code_schema_not_found") ||
      normalized.includes("schema_not_found") ||
      (normalized.includes("schema") &&
        (normalized.includes("not found") || normalized.includes("not_found")))
    )
  }

  private isPermissionCheckNotFoundError(reason: string): boolean {
    const normalized = reason.toLowerCase()
    return (
      normalized.includes("/permission/check") &&
      (normalized.includes("not found") || normalized.includes("not_found"))
    )
  }

  private async ensureTenantSchema(tenantId: string): Promise<void> {
    const inFlight = this.schemaBootstrapByTenant.get(tenantId)
    if (inFlight) {
      return inFlight
    }

    const bootstrapPromise = this.bootstrapTenantSchema(tenantId).finally(() => {
      this.schemaBootstrapByTenant.delete(tenantId)
    })

    this.schemaBootstrapByTenant.set(tenantId, bootstrapPromise)
    return bootstrapPromise
  }

  private async bootstrapTenantSchema(tenantId: string): Promise<void> {
    const client = this.getClient()

    try {
      await this.withTimeout(
        client.tenancy.create({
          id: tenantId,
          name: `Tenant ${tenantId}`,
        })
      )
    } catch (error) {
      // Tenancy may already exist; schema write below remains authoritative.
      const reason = error instanceof Error ? error.message : String(error)
      this.logger.debug(`Permify tenancy.create skipped for tenant ${tenantId}: ${reason}`)
    }

    let writeResponse: PermifySchemaWriteResponse | null = null
    let writeError: unknown = null
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        writeResponse = await this.withTimeout(
          client.schema.write({
            tenantId,
            schema: PERMIFY_GENDER_SCHEMA,
          })
        )
        break
      } catch (error) {
        writeError = error
        if (attempt >= 2) {
          throw error
        }
        const reason = error instanceof Error ? error.message : String(error)
        this.logger.warn(
          `Permify schema.write retry for tenant ${tenantId} (attempt=${attempt + 1}) after: ${reason}`
        )
        await this.sleep(150)
      }
    }

    if (!writeResponse) {
      throw (writeError as Error) ?? new Error(`Permify schema write failed for tenant ${tenantId}`)
    }

    const schemaVersion = this.extractSchemaVersion(writeResponse)
    if (schemaVersion) {
      this.runtimeSchemaVersionByTenant.set(tenantId, schemaVersion)
    }

    this.logger.log(
      `Permify schema ensured for tenant ${tenantId}${schemaVersion ? ` (schemaVersion=${schemaVersion})` : ""}`
    )
  }

  private extractSchemaVersion(response: PermifySchemaWriteResponse): string {
    return (
      response?.schemaVersion ??
      response?.schema_version ??
      response?.metadata?.schemaVersion ??
      ""
    )
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`timeout after ${this.cfg.requestTimeoutMs}ms`))
          }, this.cfg.requestTimeoutMs)
        }),
      ])
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  private toPermifyEntityType(entity: GenderEntity): string {
    return `${entity}_gender_policy`
  }

  private toPermifyEntityId(input: PermifyCheckInput): string {
    return input.targetGender
      ? `${input.tenantId}:${input.entity}:${input.targetGender}`
      : `${input.tenantId}:${input.entity}`
  }

  private toPermifyPermission(action: GenderAction): string {
    return `gender_${action}`
  }

  private failClosed(reason: string): never {
    this.logger.warn(`Fail-closed Permify PDP enforcement: ${reason}`)
    throw new ServiceUnavailableException("Authorization policy check unavailable")
  }
}
