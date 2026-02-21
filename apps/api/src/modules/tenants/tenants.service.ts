import { randomUUID } from "node:crypto"

import { Injectable, NotFoundException } from "@nestjs/common"

import { CreateTenantDto } from "./dto/create-tenant.dto"
import { UpdateTenantDto } from "./dto/update-tenant.dto"

type TenantRecord = {
  id: string
  name: string
  slug: string
  genderPolicy: "boys_only" | "girls_only" | "mixed"
}

@Injectable()
export class TenantsService {
  private readonly tenants: TenantRecord[] = []

  list(): TenantRecord[] {
    return this.tenants
  }

  getById(id: string): TenantRecord {
    const found = this.tenants.find((tenant) => tenant.id === id)
    if (!found) {
      throw new NotFoundException("Tenant not found")
    }
    return found
  }

  create(payload: CreateTenantDto): TenantRecord {
    const next: TenantRecord = {
      id: randomUUID(),
      name: payload.name,
      slug: payload.slug,
      genderPolicy: payload.genderPolicy,
    }
    this.tenants.push(next)
    return next
  }

  update(id: string, payload: UpdateTenantDto): TenantRecord {
    const found = this.getById(id)
    if (payload.name) {
      found.name = payload.name
    }
    if (payload.genderPolicy) {
      found.genderPolicy = payload.genderPolicy
    }
    return found
  }

  delete(id: string): { success: true } {
    const idx = this.tenants.findIndex((tenant) => tenant.id === id)
    if (idx < 0) {
      throw new NotFoundException("Tenant not found")
    }
    this.tenants.splice(idx, 1)
    return { success: true }
  }
}
