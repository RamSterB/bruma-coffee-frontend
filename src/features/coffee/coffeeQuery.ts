export const COFFEE_REGIONS = [
  'huila',
  'nariño',
  'valle-del-cauca',
  'caldas',
  'quindio',
  'tolima',
  'cauca',
  'cundinamarca',
  'santander',
  'arauca',
] as const

export const COFFEE_PROCESSES = ['washed', 'natural', 'honey', 'anaerobic'] as const

export const ROAST_LEVELS = ['light', 'medium', 'dark'] as const

export type CoffeeRegion = (typeof COFFEE_REGIONS)[number]
export type CoffeeProcess = (typeof COFFEE_PROCESSES)[number]
export type RoastLevel = (typeof ROAST_LEVELS)[number]

export interface CoffeeFilters {
  region?: CoffeeRegion
  process?: CoffeeProcess
  roastLevel?: RoastLevel
  search?: string
}

export interface CoffeeQuery extends CoffeeFilters {
  page: number
  limit: number
}

const addParam = (params: URLSearchParams, key: string, value: string | undefined): void => {
  const trimmed = value?.trim()

  if (trimmed !== undefined && trimmed !== '') {
    params.set(key, trimmed)
  }
}

export const buildCoffeeQuery = (query: CoffeeQuery): string => {
  const params = new URLSearchParams()

  addParam(params, 'region', query.region)
  addParam(params, 'process', query.process)
  addParam(params, 'roastLevel', query.roastLevel)
  addParam(params, 'search', query.search)
  params.set('page', String(query.page))
  params.set('limit', String(query.limit))

  return `?${params.toString()}`
}
