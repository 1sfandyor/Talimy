import bcrypt from "bcrypt"
import { db, users } from "@talimy/database"
import { and, asc, desc, eq, ilike, isNull, ne, or, type SQL, sql } from "drizzle-orm"
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"

import { CreateUserDto } from "./dto/create-user.dto"
import { ListUsersQueryDto } from "./dto/list-users-query.dto"
import { UpdateUserDto } from "./dto/update-user.dto"

type UserRole = "platform_admin" | "school_admin" | "teacher" | "student" | "parent"

type UserView = {
  id: string
  tenantId: string
  fullName: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  isActive: boolean
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class UsersService {
  private static readonly BCRYPT_ROUNDS = 12

  async list(query: ListUsersQueryDto): Promise<{
    data: UserView[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const filters: SQL[] = [eq(users.tenantId, query.tenantId), isNull(users.deletedAt)]

    if (query.role) {
      filters.push(eq(users.role, query.role))
    }
    if (query.status) {
      filters.push(eq(users.isActive, query.status === "active"))
    }
    if (query.search) {
      const search = query.search.trim()
      if (search.length > 0) {
        filters.push(
          or(
            ilike(users.firstName, `%${search}%`),
            ilike(users.lastName, `%${search}%`),
            ilike(users.email, `%${search}%`)
          )!
        )
      }
    }

    const whereExpr = and(...filters)
    const sortColumn = this.resolveSortColumn(query.sort)
    const orderExpr = query.order === "asc" ? asc(sortColumn) : desc(sortColumn)

    const totalRows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(users)
      .where(whereExpr)
    const total = totalRows[0]?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const offset = (page - 1) * query.limit

    const rows = await db
      .select()
      .from(users)
      .where(whereExpr)
      .orderBy(orderExpr)
      .limit(query.limit)
      .offset(offset)

    return {
      data: rows.map((row) => this.toUserView(row)),
      meta: {
        page,
        limit: query.limit,
        total,
        totalPages,
      },
    }
  }

  async getById(tenantId: string, id: string): Promise<UserView> {
    const row = await this.findUserOrThrow(tenantId, id)
    return this.toUserView(row)
  }

  async create(payload: CreateUserDto): Promise<UserView> {
    await this.assertUniqueEmail(payload.email)
    const { firstName, lastName } = this.splitFullName(payload.fullName)
    const passwordHash = bcrypt.hashSync(payload.password, UsersService.BCRYPT_ROUNDS)

    const [created] = await db
      .insert(users)
      .values({
        tenantId: payload.tenantId,
        firstName,
        lastName,
        email: payload.email.toLowerCase(),
        passwordHash,
        role: payload.role ?? "teacher",
        isActive: payload.isActive ?? true,
      })
      .returning()

    if (!created) {
      throw new BadRequestException("Failed to create user")
    }
    return this.toUserView(created)
  }

  async update(tenantId: string, id: string, payload: UpdateUserDto): Promise<UserView> {
    await this.findUserOrThrow(tenantId, id)

    if (payload.email) {
      await this.assertUniqueEmail(payload.email, id)
    }

    const updatePayload: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (payload.fullName) {
      const names = this.splitFullName(payload.fullName)
      updatePayload.firstName = names.firstName
      updatePayload.lastName = names.lastName
    }
    if (payload.email) {
      updatePayload.email = payload.email.toLowerCase()
    }
    if (payload.role) {
      updatePayload.role = payload.role
    }
    if (typeof payload.isActive === "boolean") {
      updatePayload.isActive = payload.isActive
    }

    const [updated] = await db
      .update(users)
      .set(updatePayload)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId), isNull(users.deletedAt)))
      .returning()

    if (!updated) {
      throw new NotFoundException("User not found")
    }
    return this.toUserView(updated)
  }

  async delete(tenantId: string, id: string): Promise<{ success: true }> {
    await this.findUserOrThrow(tenantId, id)
    await db
      .update(users)
      .set({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId), isNull(users.deletedAt)))

    return { success: true }
  }

  private async findUserOrThrow(
    tenantId: string,
    userId: string
  ): Promise<typeof users.$inferSelect> {
    const [row] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId), isNull(users.deletedAt)))
      .limit(1)
    if (!row) {
      throw new NotFoundException("User not found")
    }
    return row
  }

  private async assertUniqueEmail(email: string, ignoreUserId?: string): Promise<void> {
    const normalizedEmail = email.toLowerCase()
    const baseFilter: SQL[] = [eq(users.email, normalizedEmail), isNull(users.deletedAt)]
    if (ignoreUserId) {
      baseFilter.push(ne(users.id, ignoreUserId))
    }

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(...baseFilter))
      .limit(1)
    if (existing) {
      throw new BadRequestException("Email already exists")
    }
  }

  private splitFullName(fullName: string): { firstName: string; lastName: string } {
    const normalized = fullName.trim().replace(/\s+/g, " ")
    const parts = normalized.split(" ").filter((part) => part.length > 0)
    if (parts.length === 0) {
      return { firstName: "User", lastName: "Unknown" }
    }
    if (parts.length === 1) {
      return { firstName: parts[0]!, lastName: "Unknown" }
    }
    const firstName = parts[0]!
    const lastName = parts.slice(1).join(" ")
    return { firstName, lastName }
  }

  private resolveSortColumn(sort: string | undefined) {
    switch (sort) {
      case "email":
        return users.email
      case "role":
        return users.role
      case "isActive":
        return users.isActive
      case "firstName":
        return users.firstName
      case "lastName":
        return users.lastName
      case "updatedAt":
        return users.updatedAt
      case "createdAt":
      default:
        return users.createdAt
    }
  }

  private toUserView(row: typeof users.$inferSelect): UserView {
    const fullName = `${row.firstName} ${row.lastName}`.trim()
    return {
      id: row.id,
      tenantId: row.tenantId,
      fullName,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      role: row.role,
      isActive: row.isActive,
      lastLogin: row.lastLogin,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
