import { Alert, Button } from '@mui/material'

export interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Alert
      role="alert"
      severity="error"
      className="w-full max-w-2xl"
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            Reintentar
          </Button>
        ) : undefined
      }
    >
      {message}
    </Alert>
  )
}
