import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IconoCategoria } from './IconoCategoria'

describe('IconoCategoria', () => {
  it('renderiza un svg con un icono distinto para cada categoría real', () => {
    const { container: plancha } = render(<IconoCategoria nombre="Clásicos a la plancha" />)
    const { container: mar } = render(<IconoCategoria nombre="Del mar" />)
    const svgPlancha = plancha.querySelector('svg')
    const svgMar = mar.querySelector('svg')
    expect(svgPlancha).toBeInTheDocument()
    expect(svgMar).toBeInTheDocument()
    expect(svgPlancha?.innerHTML).not.toBe(svgMar?.innerHTML)
  })

  it('usa un icono genérico para una categoría que no tiene uno propio', () => {
    const { container } = render(<IconoCategoria nombre="Categoría nueva sin icono todavía" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('es decorativo: no interfiere con lectores de pantalla', () => {
    const { container } = render(<IconoCategoria nombre="Hamburguesas" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
