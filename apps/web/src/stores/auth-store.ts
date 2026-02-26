import { create } from "zustand"

export type GenderScope = "male" | "female" | "all"

export type AuthUser = {
  id: string
  tenantId?: string
  roles: string[]
  genderScope?: GenderScope
  name?: string | null
  email?: string | null
}

export type AuthTenant = {
  id: string
  slug?: string | null
  name?: string | null
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated"

type AuthStoreState = {
  status: AuthStatus
  user: AuthUser | null
  tenant: AuthTenant | null
  permissions: string[]
  accessToken: string | null
  refreshToken: string | null
  setSession: (payload: {
    user: AuthUser
    accessToken: string | null
    refreshToken: string | null
    tenant?: AuthTenant | null
    permissions?: string[]
  }) => void
  setAuthStatus: (status: AuthStatus) => void
  setPermissions: (permissions: string[]) => void
  patchUser: (patch: Partial<AuthUser>) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  status: "unauthenticated",
  user: null,
  tenant: null,
  permissions: [],
  accessToken: null,
  refreshToken: null,
  setSession: ({ user, accessToken, refreshToken, tenant, permissions }) =>
    set({
      status: "authenticated",
      user,
      tenant: tenant ?? (user.tenantId ? { id: user.tenantId } : null),
      permissions: permissions ?? [],
      accessToken,
      refreshToken,
    }),
  setAuthStatus: (status) => set({ status }),
  setPermissions: (permissions) => set({ permissions }),
  patchUser: (patch) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...patch } : state.user,
      tenant:
        state.tenant || !patch.tenantId
          ? state.tenant
          : {
              id: patch.tenantId,
            },
    })),
  clearSession: () =>
    set({
      status: "unauthenticated",
      user: null,
      tenant: null,
      permissions: [],
      accessToken: null,
      refreshToken: null,
    }),
}))
