import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Snackbar,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { formatCop } from '../../lib/formatCurrency'
import {
  cardBrandFromNumber,
  isSupportedBrand,
  validateCard,
  validateCvv,
  validateExpiry,
} from '../../lib/cardValidation'
import { CardForm, type CardFormValues } from './CardForm'
import { clearSavedCart } from '../cart/cartStorage'
import { clearCart, resolveCart } from '../cart/cartSlice'
import {
  fetchCities,
  fetchDepartments,
  fetchSummary,
  reiniciarCheckout,
  selectSummary,
  submitShipping,
  type ShippingData,
} from './checkoutSlice'
import {
  fetchGatewayConfig,
  fetchOrderStatus,
  payOrder,
  paymentReset,
} from '../payment/paymentSlice'
import { PaymentResult } from '../payment/PaymentResult'

const CELDAS_TELEFONO = 10

export interface CheckoutModalProps {
  open: boolean
  onClose: () => void
}

const celdasDelTelefono = (valor: string): number =>
  valor.replace(/\D/g, '').replace(/^57/, '').length

/**
 * El modal del checkout, en el orden que pide el proceso: **primero** la tarjeta
 * y los datos de entrega, y **después** el resumen con el botón de pago. Al revés
 * se ve el total antes de poder corregir nada de lo que lo produce.
 *
 * **Aquí no se calcula ni un peso.** Los importes llegan del backend y se enseñan
 * tal cual. El formulario solo comprueba lo que es obvio sin red, como que el
 * teléfono tenga diez dígitos o que la tarjeta pase el algoritmo de Luhn.
 */
export function CheckoutModal({ open, onClose }: CheckoutModalProps) {
  const dispatch = useAppDispatch()
  const navegar = useNavigate()
  const summary = useAppSelector(selectSummary)
  const pago = useAppSelector((estado) => estado.payment)
  const correoDeLaSesion = useAppSelector((estado) => estado.auth.user?.email ?? '')
  const { departments, cities, status, error } = useAppSelector((state) => state.checkout)

  const [paso, setPaso] = useState(0)
  const [tarjeta, setTarjeta] = useState<CardFormValues>({
    number: '',
    holder: '',
    expiry: '',
    cvv: '',
  })
  const [faltanCampos, setFaltanCampos] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [department, setDepartment] = useState('')
  const [city, setCity] = useState('')

  // El desplegable muestra el nombre, que es lo que la persona reconoce, pero la
  // ruta de las ciudades va por identificador. Sin esta cuenta, la petición sale
  // a `/departments/Cundinamarca/cities` y no existe.
  const idDelDepartamento = departments.find((d) => d.name === department)?.id

  useEffect(() => {
    if (open) {
      setPaso(0)
      dispatch(reiniciarCheckout())
      // El estado del pago se limpia al abrir: si el proceso anterior terminó, sus
      // datos ya están en la orden y mostrarlos aquí sería de otra compra.
      dispatch(paymentReset())
      void dispatch(fetchSummary())
      void dispatch(fetchDepartments())
      // La configuración de la pasarela se pide al abrir, y no al pagar, para que el
      // error de configuración aparezca antes de que alguien escriba su tarjeta.
      void dispatch(fetchGatewayConfig())
    }
  }, [open, dispatch])

  useEffect(() => {
    if (idDelDepartamento === undefined) {
      return
    }

    void dispatch(fetchCities(idDelDepartamento))
    setCity('')
  }, [idDelDepartamento, dispatch])

  const tarjetaValida =
    validateCard(tarjeta.number) &&
    tarjeta.holder.trim().length >= 3 &&
    validateExpiry(tarjeta.expiry) &&
    validateCvv(tarjeta.cvv) &&
    isSupportedBrand(cardBrandFromNumber(tarjeta.number))

  // Tres pasos visibles: tarjeta y envío, resumen, y resultado. El resultado no es
  // una pantalla aparte porque se abrió desde este modal y quien compra sigue aquí.
  const entregaValida =
    fullName.trim().length >= 3 &&
    documentNumber.replace(/\D/g, '').length >= 6 &&
    celdasDelTelefono(phone) === CELDAS_TELEFONO &&
    address.trim().length >= 5 &&
    department !== '' &&
    city !== ''

  /**
   * El último paso del proceso: volver a la ficha del café con el stock ya
   * descontado. Antes este botón solo cerraba el modal, así que el paso no existía;
   * un botón que dice "Ver el café" y no lleva al café es peor que no tenerlo.
   */
  const volverAlCafe = (variantId: string) => {
    onClose()
    navegar(variantId === '' ? '/cafes' : `/cafe/${variantId}`)
  }

  /**
   * El carrito se vacía aquí, no al abrir el modal ni antes de cobrar. Al backend ya
   * lo vacía el mismo evento que confirma el pago; esto es lo que se ve en pantalla,
   * y sin esto quien paga vuelve a ver sus cafés en el cajón y no sabe si se le
   * cobró dos veces.
   */
  const limpiarElCarrito = () => {
    dispatch(clearCart())
    clearSavedCart()
    void dispatch(resolveCart())
  }

  const pagando = pago.status === 'tokenizing'

  /**
   * El pago, en tres pasos que no se pueden saltar: tokenizar en el navegador,
   * crear la orden y consultar el desenlace. Si la tokenización falla **no se crea
   * ninguna orden**, que es justo lo que evita dejar pedidos pendientes de tarjetas
   * que nunca se pudieron cobrar.
   */
  const pagar = async () => {
    if (pago.gateway === null) {
      setAviso('La tienda no tiene configurada la pasarela de pago.')

      return
    }

    const creada = await dispatch(
      payOrder({
        card: tarjeta,
        shipping: {
          fullName,
          documentNumber,
          phone: `57${celdasDelTelefono(phone) === CELDAS_TELEFONO ? phone.replace(/\D/g, '').slice(-CELDAS_TELEFONO) : phone.replace(/\D/g, '')}`,
          address,
          city,
          department,
        },
        email: correoDeLaSesion,
        gateway: pago.gateway,
      }),
    )

    if (payOrder.rejected.match(creada)) {
      setAviso(creada.payload ?? 'No pudimos procesar el pago')

      return
    }

    setPaso(2)
    const estadoFinal = await dispatch(fetchOrderStatus(creada.payload.id))

    if (
      fetchOrderStatus.fulfilled.match(estadoFinal) &&
      estadoFinal.payload.paymentStatus === 'APPROVED'
    ) {
      limpiarElCarrito()
    }
  }

  const continuar = async (evento: FormEvent) => {
    evento.preventDefault()

    if (!tarjetaValida || !entregaValida) {
      setFaltanCampos(true)

      return
    }

    setFaltanCampos(false)

    try {
      // `unwrap` es lo que evita el fallo más tonto de esta pantalla: avanzar al
      // resumen aunque el backend haya rechazado los datos. El formulario solo
      // existe en el primer paso, así que saltarse al resumen deja a la persona
      // sin ver los campos que tiene que corregir y con el error escondido.
      await dispatch(
        submitShipping({
          fullName,
          documentNumber,
          phone,
          address,
          city,
          department,
        } satisfies ShippingData),
      ).unwrap()
      setPaso(1)
    } catch {
      // El mensaje ya quedó en el store y esta misma pantalla lo enseña.
    }
  }

  const cargando = status === 'loading'
  // La respuesta viene de la red: si le falta `lines`, la pantalla se cae de
  // golpe. Con la lista vacia se ve "el carrito está vacío", que es un estado
  // real y además dice la verdad.
  const lineas = summary?.lines ?? []
  const vacio = summary !== null && lineas.length === 0

  return (
    <>
      {/*
        Sin `aria-label` en la raíz a propósito. El nombre del diálogo lo pone el
        `DialogTitle` de abajo, que es el texto que se ve. Con el `aria-label` aquí
       jaiado, el atributo，看起来已经设置好了，其实没有：quien lo lea cree que el
        nombre está resuelto, y si mañana se quita el título el diálogo se queda
        mudo sin que nada avise.
      */}
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Finalizar compra</DialogTitle>

        <DialogContent>
          <Stepper activeStep={paso} sx={{ mb: 3 }}>
            <Step>
              <StepLabel>Tarjeta y envío</StepLabel>
            </Step>
            <Step>
              <StepLabel>Resumen</StepLabel>
            </Step>
            <Step>
              <StepLabel>Resultado</StepLabel>
            </Step>
          </Stepper>

          {error !== null && <Alert severity="error">{error}</Alert>}

          {paso === 2 ? (
            <PaymentResult
              estado={pago.finalStatus}
              cargando={pago.status === 'waiting'}
              purchasedVariantId={pago.purchasedVariantId}
              onVolverAlCafe={volverAlCafe}
            />
          ) : paso === 0 ? (
            <Box component="form" onSubmit={continuar} noValidate>
              <Stack spacing={3}>
                <Typography variant="subtitle1">Tarjeta</Typography>

                <CardForm values={tarjeta} onChange={setTarjeta} onInvalid={setAviso} />

                <Typography variant="subtitle1">Datos de entrega</Typography>

                <Stack spacing={2}>
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
                    error={faltanCampos && celdasDelTelefono(phone) !== CELDAS_TELEFONO}
                    helperText={
                      faltanCampos && celdasDelTelefono(phone) !== CELDAS_TELEFONO
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
                </Stack>

                <Button type="submit" variant="contained" disabled={cargando} fullWidth>
                  {cargando ? 'Validando…' : 'Ver el resumen'}
                </Button>
              </Stack>
            </Box>
          ) : (
            <Stack spacing={2}>
              {vacio ? (
                <Typography variant="body2">Tu carrito está vacío.</Typography>
              ) : (
                <Stack spacing={1} divider={<Divider flexItem />}>
                  {lineas.map((linea) => (
                    <Stack
                      key={linea.variantId}
                      direction="row"
                      spacing={2}
                      sx={{ justifyContent: 'space-between' }}
                    >
                      <Stack spacing={0}>
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

              <Button variant="text" onClick={() => setPaso(0)}>
                Volver a corregir los datos
              </Button>

              <Button
                variant="contained"
                fullWidth
                disabled={cargando || vacio || pagando}
                onClick={() => void pagar()}
              >
                {pagando ? 'Pagando…' : 'Pagar'}
              </Button>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={aviso !== null}
        autoHideDuration={6000}
        onClose={() => setAviso(null)}
        message={aviso ?? ''}
      />
    </>
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
