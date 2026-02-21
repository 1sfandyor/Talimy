# Phase 2 Auth Slice Checklist

## Goal

- Implement backend slice end-to-end without waiting for frontend.
- Validate behavior, tenant isolation, and basic security in the same slice.

## Required checks (per slice)

1. `bun run build --filter=api`
2. `bun run typecheck --filter=api`
3. `bun run lint --filter=api`
4. Manual API smoke with `curl` (success + fail paths)
5. Security checks (auth + role + tenant mismatch)

## Auth smoke commands

```bash
curl -i -X POST https://api.talimy.space/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@talimy.space\",\"password\":\"password123\"}"

curl -i -X POST https://api.talimy.space/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"refresh_admin@talimy.space\"}"

curl -i -X POST https://api.talimy.space/api/auth/logout
```

## Guard smoke commands

```bash
# Should fail without x-user-id
curl -i "https://api.talimy.space/api/users?tenantId=talimy-school"

# Should pass with auth headers
curl -i "https://api.talimy.space/api/users?tenantId=talimy-school" \
  -H "x-user-id: user_1" \
  -H "x-tenant-id: talimy-school" \
  -H "x-user-roles: school_admin"

# Should fail on tenant mismatch
curl -i -X POST "https://api.talimy.space/api/students" \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_1" \
  -H "x-tenant-id: tenant-a" \
  -d "{\"tenantId\":\"tenant-b\",\"fullName\":\"Ali Valiyev\",\"studentCode\":\"S-100\",\"gender\":\"male\"}"
```

## Security acceptance

- Missing auth header -> `401`
- Missing role for protected route -> `403`
- Tenant mismatch -> `403`
- Invalid payload -> `400`

## Notes

- Keep frontend-independent verification mandatory.
- Do not move to next Phase 2 task before this checklist is green.
