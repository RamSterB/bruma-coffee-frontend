import { useEffect, useState, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { formatCop } from '../../lib/formatCurrency'
import {
  fetchCities,
  fetchDepartments,
  fetchSummary,
  selectSummary,
  submitShipping,
  type ShippingData,
} from './checkoutSlice'

const CELDAS = 10

export interface CheckoutModalProps {
  open: boolean
  onClose: () => void
}

const celdasDelTelefono = (valor: string): number =>
  valor.replace(/\D/g, '').replace(/^57/, '').length

/**
 * El modal del resumen, con el desglose y los datos de entrega.
 *
 * **Aquí no se calcula ni un peso.** Los importes llegan del backend y se
 * enseñan tal cual: calcular el IVA en el navegador haría que cada visitante
 * viera un total y el cobro fuera otro. El formulario solo comprueba lo que es
 * obvio sin red, como que el teléfono tenga diez dígitos.
 */
export function CheckoutModal({ open, onClose }: CheckoutModalProps) {
  const dispatch = useAppDispatch()
  const summary = useAppSelector(selectSummary)
  const { departments, cities, status, error } = useAppSelector((state) => state.checkout)

  const [fullName, setFullName] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [department, setDepartment] = useState('')
  const [city, setCity] = useState('')
  const [faltanCampos, setFaltanCampos] = useState(false)

  // El desplegable muestra el nombre, que es lo que la persona reconoce, pero la
  // ruta de las ciudades va por identificador. Sin esta cuenta, la petición
  // sale a `/departments/Cundinamarca/cities` y no existe.
  const idDelDepartamento = departments.find((d) => d.name === department)?.id

  useEffect(() => {
    if (open) {
      void dispatch(fetchSummary())
      void dispatch(fetchDepartments())
    }
  }, [open, dispatch])

  useEffect(() => {
    if (idDelDepartamento === undefined) {
      return
    }

    void dispatch(fetchCities(idDelDepartamento))
    setCity('')
  }, [idDelDepartamento, dispatch])

  const datosValidos =
    fullName.trim().length >= 3 &&
    documentNumber.replace(/\D/g, '').length >= 6 &&
    celdasDelTelefono(phone) === CELDAS &&
    address.trim().length >= 5 &&
    department !== '' &&
    city !== ''

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()

    if (!datosValidos) {
      setFaltanCampos(true)

      return
    }

    setFaltanCampos(false)
    await dispatch(
      submitShipping({
        fullName,
        documentNumber,
        phone,
        address,
        city,
        department,
      } satisfies ShippingData),
    )
  }

  const cargando = status === 'loading'
  const vacio = summary !== null && summary.lines.length === 0

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-label="Resumen de la orden">
      <DialogTitle>Resumen de la orden</DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {error !== null && <Alert severity="error">{error}</Alert>}

          {vacio ? (
            <Typography variant="body2">Tu carrito está vacío.</Typography>
          ) : (
            <Stack spacing={1} divider={<Divider flexItem />}>
              {summary?.lines.map((linea) => (
                <Stack
                  key={linea.variantId}
                  direction="row"
                  spacing={2}
                  sx={{ justifyContent: 'space-between' }}
                >
                  <Stack spacing={0}>
                    {/* Nombre, cantidad y precio van en elementos separados y no
                        en un solo texto: un lector de pantalla lee mejor "Café
                        Nariño", "2 unidades", "$ 42.000 cada uno" que una frase
                        con guiones pegados. */}
                    <Typography variant="body2">{linea.coffeeName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {`${linea.quantity} × ${formatCop(linea.unitPrice)}`}
                    </Typography>
                  </Stack>
                  <Typography variant="body2">{formatCop(linea.subtotal)}</Typography>
                </Stack>
              ))}

              <Fila etiqueta="Subtotal" valor={formatCop(summary?.subtotal ?? 0)} />
              <Fila
                etiqueta="Envío"
                valor={
                  summary?.isFreeShipping === true
                    ? 'Envío gratis'
                    : formatCop(summary?.shipping ?? 0)
                }
              />
              <Fila etiqueta="Impuestos (IVA 19 %)" valor={formatCop(summary?.tax ?? 0)} />
              <Fila etiqueta="Total" valor={formatCop(summary?.total ?? 0)} destacado />
            </Stack>
          )}

          {!vacio && (
            <Box component="form" onSubmit={enviar} noValidate>
              <Typography variant="subtitle1" gutterBottom>
                Datos de entrega
              </Typography>

              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  label="Nombre de quien recibe"
                  value={fullName}
                  onChange={(evento) => setFullName(evento.target.value)}
                  error={faltanCampos && fullName.trim().length < 3}
                  helperText={
                    faltanCampos && fullName.trim().length < 3 ? 'Escribe el nombre' : ' '
                  }
                  fullWidth
                />

                <TextField
                  label="Número de documento"
                  value={documentNumber}
                  onChange={(evento) => setDocumentNumber(evento.target.value)}
                  error={faltanCampos && documentNumber.replace(/\D/g, '').length < 6}
                  helperText={
                    faltanCampos && documentNumber.replace(/\D/g, '').length < 6
                      ? 'El documento necesita al menos 6 dígitos'
                      : ' '
                  }
                  fullWidth
                />

                <TextField
                  label="Teléfono (celular)"
                  value={phone}
                  onChange={(evento) => setPhone(evento.target.value)}
                  error={faltanCampos && celdasDelTelefono(phone) !== CELDAS}
                  helperText={
                    faltanCampos && celdasDelTelefono(phone) !== CELDAS
                      ? 'El teléfono debe ser un celular de 10 dígitos'
                      : 'Solo celular: un pedido se entrega a un teléfono que llevas encima'
                  }
                  fullWidth
                />

                <TextField
                  label="Dirección"
                  value={address}
                  onChange={(evento) => setAddress(evento.target.value)}
                  error={faltanCampos && address.trim().length < 5}
                  helperText={
                    faltanCampos && address.trim().length < 5 ? 'Escribe la dirección' : ' '
                  }
                  fullWidth
                />

                <TextField
                  select
                  label="Departamento"
                  value={department}
                  onChange={(evento) => setDepartment(evento.target.value)}
                  error={faltanCampos && department === ''}
                  helperText={faltanCampos && department === '' ? 'Elige el departamento' : ' '}
                  fullWidth
                >
                  {departments.map((opcion) => (
                    <MenuItem key={opcion.id} value={opcion.name}>
                      {opcion.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Ciudad"
                  value={city}
                  onChange={(evento) => setCity(evento.target.value)}
                  error={faltanCampos && city === ''}
                  helperText={
                    faltanCampos && city === ''
                      ? department === ''
                        ? 'Elige primero el departamento'
                        : 'Elige la ciudad'
                      : ' '
                  }
                  disabled={department === ''}
                  fullWidth
                >
                  {cities.map((opcion) => (
                    <MenuItem key={opcion.id} value={opcion.name}>
                      {opcion.name}
                    </MenuItem>
                  ))}
                </TextField>

                <Button type="submit" variant="contained" disabled={cargando} fullWidth>
                  {cargando ? 'Confirmando…' : 'Confirmar entrega'}
                </Button>
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

interface FilaProps {
  etiqueta: string
  valor: string
  destacado?: boolean
}

const Fila = ({ etiqueta, valor, destacado = false }: FilaProps) => (
  <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
    <Typography variant={destacado ? 'subtitle1' : 'body2'}>{etiqueta}</Typography>
    <Typography variant={destacado ? 'subtitle1' : 'body2'}>{valor}</Typography>
  </Stack>
)
