import { Button, MenuItem, Stack, TextField } from '@mui/material'
import { COFFEE_PROCESSES, COFFEE_REGIONS, ROAST_LEVELS } from './coffeeQuery'
import type {
  CoffeeFilters,
  CoffeeProcess,
  CoffeeRegion,
  RoastLevel,
} from './coffeeQuery'

const REGION_LABELS: Record<CoffeeRegion, string> = {
  huila: 'Huila',
  'nariño': 'Nariño',
  'valle-del-cauca': 'Valle del Cauca',
  caldas: 'Caldas',
  quindio: 'Quindío',
  tolima: 'Tolima',
  cauca: 'Cauca',
  cundinamarca: 'Cundinamarca',
  santander: 'Santander',
  arauca: 'Arauca',
}

const PROCESS_LABELS: Record<CoffeeProcess, string> = {
  washed: 'Lavado',
  natural: 'Natural',
  honey: 'Honey',
  anaerobic: 'Anaeróbico',
}

const ROAST_LABELS: Record<RoastLevel, string> = {
  light: 'Claro',
  medium: 'Medio',
  dark: 'Oscuro',
}

interface Props {
  filters: CoffeeFilters
  onChange: (filters: CoffeeFilters) => void
  onSearch: (search: string) => void
}

export function CoffeeFiltersBar({ filters, onChange, onSearch }: Props) {
  const hasFilters =
    filters.region !== undefined ||
    filters.process !== undefined ||
    filters.roastLevel !== undefined ||
    (filters.search ?? '').trim() !== ''

  return (
    <Stack
      component="form"
      role="search"
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ alignItems: { sm: 'center' } }}
      onSubmit={(event: React.FormEvent<HTMLFormElement>) => event.preventDefault()}
    >
      <TextField
        select
        size="small"
        label="Región"
        value={filters.region ?? ''}
        onChange={(event) =>
          onChange({ ...filters, region: (event.target.value || undefined) as CoffeeRegion | undefined })
        }
      >
        <MenuItem value="">Todas</MenuItem>
        {COFFEE_REGIONS.map((region) => (
          <MenuItem key={region} value={region}>
            {REGION_LABELS[region]}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Proceso"
        value={filters.process ?? ''}
        onChange={(event) =>
          onChange({
            ...filters,
            process: (event.target.value || undefined) as CoffeeProcess | undefined,
          })
        }
      >
        <MenuItem value="">Todos</MenuItem>
        {COFFEE_PROCESSES.map((process) => (
          <MenuItem key={process} value={process}>
            {PROCESS_LABELS[process]}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Tueste"
        value={filters.roastLevel ?? ''}
        onChange={(event) =>
          onChange({
            ...filters,
            roastLevel: (event.target.value || undefined) as RoastLevel | undefined,
          })
        }
      >
        <MenuItem value="">Todos</MenuItem>
        {ROAST_LEVELS.map((roastLevel) => (
          <MenuItem key={roastLevel} value={roastLevel}>
            {ROAST_LABELS[roastLevel]}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        size="small"
        type="search"
        label="Buscar"
        placeholder="Nombre o nota de cata"
        value={filters.search ?? ''}
        className="flex-1"
        onChange={(event) => onSearch(event.target.value)}
      />

      {hasFilters ? (
        <Button variant="outlined" onClick={() => onSearch('')}>
          Limpiar filtros
        </Button>
      ) : null}
    </Stack>
  )
}
