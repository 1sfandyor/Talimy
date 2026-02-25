import { ForbiddenException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"

import { getPermifyConfig } from "@/config/permify.config"

import { createPermifyClient, PERMIFY_CHECK_RESULT, type PermifyClient } from "./permify-sdk"

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

      const response = await this.withTimeout(
        this.getClient().permission.check({
          tenantId: input.tenantId,
          metadata: {
            snapToken: "",
            schemaVersion: this.cfg.schemaVersion ?? "",
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
