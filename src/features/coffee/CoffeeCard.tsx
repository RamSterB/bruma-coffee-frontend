import { Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material'
import { formatCop } from '../../lib/formatCurrency'
import type { Coffee, CoffeeVariant } from './types'

const VariantRow = ({ variant }: { variant: CoffeeVariant }) => (
  <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
    <Typography variant="body2" color="text.secondary">
      {variant.weightGrams} g
    </Typography>
    <Typography variant="body2" color="primary.light">
      {formatCop(variant.price)}
    </Typography>
    {variant.stock === 0 ? (
      <Chip size="small" color="error" variant="outlined" label="Agotado" />
    ) : null}
  </Stack>
)

export function CoffeeCard({ coffee, onOpen }: { coffee: Coffee; onOpen: () => void }) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderColor: 'rgba(251, 191, 36, 0.25)',
        backgroundColor: 'rgba(120, 53, 15, 0.15)',
      }}
    >
      <CardActionArea
        onClick={onOpen}
        aria-label={`Detalle de ${coffee.name}`}
        sx={{ height: '100%', alignItems: 'stretch' }}
      >
        <CardContent className="flex h-full flex-col gap-3">
          <header className="flex flex-col gap-1">
            <Typography variant="h6" component="h3" className="text-amber-100">
              {coffee.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {coffee.description}
            </Typography>
          </header>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip size="small" label={coffee.region} />
            <Chip size="small" label={coffee.process} />
            <Chip size="small" label={coffee.roastLevel} />
          </Stack>

          {coffee.tastingNotes.length > 0 ? (
            <Typography variant="body2" color="text.secondary">
              {coffee.tastingNotes.join(' · ')}
            </Typography>
          ) : null}

          {coffee.priceFrom !== null ? (
            <Typography variant="body2" color="text.secondary">
              Desde {formatCop(coffee.priceFrom)}
            </Typography>
          ) : null}

          <Stack
            direction="column"
            spacing={1}
            className="mt-auto w-full border-t border-neutral-800 pt-3"
          >
            {coffee.variants.map((variant) => (
              <VariantRow key={variant.id} variant={variant} />
            ))}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
