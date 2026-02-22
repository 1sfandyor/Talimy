import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"

import { getPermifyConfig } from "@/config/permify.config"

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

  async assertGenderAccess(input: PermifyCheckInput): Promise<void> {
    if (!this.cfg.enabled || !this.cfg.endpoint) {
      this.failClosed("Permify PDP is not configured")
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.cfg.requestTimeoutMs)
    try {
      const response = await fetch(this.cfg.endpoint!, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tenantId: input.tenantId,
          userId: input.userId,
          roles: input.roles,
          userGenderScope: input.userGenderScope,
          entity: input.entity,
          action: input.action,
          targetGender: input.targetGender,
          schemaVersion: this.cfg.schemaVersion,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        this.failClosed(`Permify PDP returned ${response.status}`)
      }

      const body = (await response.json()) as { allow?: boolean }
      if (body.allow !== true) {
        this.failClosed("Permify PDP denied or malformed response")
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error"
      this.failClosed(`Permify PDP request failed: ${reason}`)
    } finally {
      clearTimeout(timeout)
    }
  }

  private failClosed(reason: string): never {
    this.logger.warn(`Fail-closed Permify PDP enforcement: ${reason}`)
    throw new ServiceUnavailableException("Authorization policy check unavailable")
  }
}
