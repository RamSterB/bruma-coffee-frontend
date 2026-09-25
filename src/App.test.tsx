import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { describe, expect, it } from 'vitest'
import App from './App'
import { createTestStore } from './app/store'

describe('App', () => {
  it('monta la aplicación con el router y el store', () => {
    render(
      <Provider store={createTestStore()}>
        <App />
      </Provider>,
    )

    expect(screen.getByRole('heading', { name: /bruma coffee/i })).toBeInTheDocument()
  })
})
