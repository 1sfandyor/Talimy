import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { CreateTenantDto } from "./dto/create-tenant.dto"
import { ListTenantsQueryDto } from "./dto/list-tenants-query.dto"
import { UpdateTenantBillingDto } from "./dto/update-tenant-billing.dto"
import { UpdateTenantDto } from "./dto/update-tenant.dto"
import { TenantsRepository } from "./tenants.repository"

@Injectable()
export class TenantsService {
  constructor(private readonly repository: TenantsRepository) {}

  async resolveTenantContextBySlug(
    slug: string
  ): Promise<{ tenantId: string; tenantSlug: string }> {
    const resolved = await this.repository.findResolutionBySlug(slug)
    if (!resolved) {
      throw new NotFoundException("Tenant not found")
    }

    if (resolved.status !== "active") {
      throw new ForbiddenException("Tenant is not active")
    }

    return {
      tenantId: resolved.id,
      tenantSlug: resolved.slug,
    }
  }

  list(query: ListTenantsQueryDto) {
    return this.repository.list(query)
  }

  getById(id: string) {
    return this.repository.getById(id)
  }

  create(payload: CreateTenantDto) {
    return this.repository.create(payload)
  }

  update(id: string, payload: UpdateTenantDto) {
    return this.repository.update(id, payload)
  }

  delete(id: string) {
    return this.repository.delete(id)
  }

  activate(id: string) {
    return this.repository.activate(id)
  }

  deactivate(id: string) {
    return this.repository.deactivate(id)
  }

  getStats(id: string) {
    return this.repository.getStats(id)
  }

  getBilling(id: string) {
    return this.repository.getBilling(id)
  }

  updateBilling(id: string, payload: UpdateTenantBillingDto) {
    return this.repository.updateBilling(id, payload)
  }
}
