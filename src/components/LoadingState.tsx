export interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Cargando' }: LoadingStateProps) {
  return (
    <p role="status" aria-live="polite" className="text-amber-200">
      {message}
    </p>
  )
}
