export const AUTH_ROUTE_PATHS = {
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
} as const

// FAZA 7 yakunlangunga qadar NextAuth API route placeholder (501) holatda turadi.
// Root AuthProvider shu flag orqali SessionProvider'ni o'chirib, public pages crash bo'lishini oldini oladi.
export const NEXTAUTH_PLACEHOLDER_ENABLED = true
