import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Los Select de Material UI no son <select> nativos: se abren con un clic y la
 * opción se elige del listbox. Este helper replica esa interacción real.
 */
export const chooseOption = async (label: string, optionName: string): Promise<void> => {
  await userEvent.click(screen.getByLabelText(label))
  await userEvent.click(await screen.findByRole('option', { name: optionName }))
}
