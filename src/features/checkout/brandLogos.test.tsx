import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { render } from '@testing-library/react'
import { resolve } from 'node:path'
import { MastercardLogo, VisaLogo } from './brandLogos'

/**
 * Los logotipos se copiaron de los SVG de origen y **no se redibujan**. Este test
 * existe porque esa copia se hizo mal una vez: el `path` de Visa estaba escrito a
 * mano, el SVG compilaba, se veía y parecía funcionar, pero la forma salía
 * deformada. Compilar no significa que una marca sea correcta.
 */
const SOURCE_DE_VISA = resolve(__dirname, '../../../assets/brand/visa-logo-2021.svg')
const SOURCE_DE_MASTERCARD = resolve(__dirname, '../../../assets/brand/mastercard-2019-logo.svg')

const pathsDe = (svg: string): string[] =>
  [...svg.matchAll(/ d="([^"]+)"/g)].map((encontrado) => encontrado[1] as string)

const pathsRenderizados = (): string[] => {
  const { container } = render(
    <div>
      <VisaLogo />
      <MastercardLogo />
    </div>,
  )

  return pathsDe(container.innerHTML)
}

describe('logotipos de las redes', () => {
  it('el path de Visa es el del SVG de origen, sin una sola diferencia', () => {
    const original = pathsDe(readFileSync(SOURCE_DE_VISA, 'utf8'))
    const renderizados = pathsRenderizados().slice(0, original.length)

    expect(renderizados).toEqual(original)
  })

  it('los tres paths de Mastercard son los del SVG de origen', () => {
    const original = pathsDe(readFileSync(SOURCE_DE_MASTERCARD, 'utf8'))
    const renderizados = pathsRenderizados().slice(-original.length)

    expect(renderizados).toEqual(original)
  })
})
