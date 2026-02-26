export const CACHE_TTLS = {
  scheduleListSeconds: 60,
  scheduleItemSeconds: 60,
  financeOverviewSeconds: 60,
  financePaymentsSummarySeconds: 60,
} as const

export function scheduleCachePrefix(tenantId: string): string {
  return `schedule:${tenantId}:`
}

export function scheduleListCacheKey(tenantId: string, queryHash: string): string {
  return `${scheduleCachePrefix(tenantId)}list:${queryHash}`
}

export function scheduleItemCacheKey(tenantId: string, id: string): string {
  return `${scheduleCachePrefix(tenantId)}item:${id}`
}

export function financeCachePrefix(tenantId: string): string {
  return `finance:${tenantId}:`
}

export function financeOverviewCacheKey(tenantId: string): string {
  return `${financeCachePrefix(tenantId)}overview`
}

export function financePaymentsSummaryCacheKey(tenantId: string): string {
  return `${financeCachePrefix(tenantId)}payments-summary`
}
