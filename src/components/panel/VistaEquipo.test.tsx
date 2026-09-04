import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VistaEquipo } from './VistaEquipo'
import type { MiembroEquipo } from '@/lib/personal/equipo'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const EQUIPO: MiembroEquipo[] = [{ userId: 'u-1', nombre: 'Javier', rol: 'admin', email: 'javier@example.com' }]

beforeEach(() => {
  vi.restoreAllMocks()
  refresh.mockReset()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }))
})

describe('VistaEquipo', () => {
  it('muestra el equipo actual', () => {
    render(<VistaEquipo equipo={EQUIPO} />)
    expect(screen.getByText('Javier')).toBeInTheDocument()
    expect(screen.getByText('javier@example.com')).toBeInTheDocument()
  })

  it('invita a una persona nueva y refresca el listado', async () => {
    render(<VistaEquipo equipo={EQUIPO} />)
    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com')
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana')
    await userEvent.selectOptions(screen.getByLabelText('Rol'), 'cocina')
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/equipo',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'ana@example.com', nombre: 'Ana', rol: 'cocina' }),
      }),
    )
    expect(await screen.findByText('Invitación enviada a ana@example.com.')).toBeInTheDocument()
    expect(refresh).toHaveBeenCalled()
  })

  it('muestra el error si la invitación falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Ya existe esa cuenta' }) }),
    )
    render(<VistaEquipo equipo={EQUIPO} />)
    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com')
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana')
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }))

    expect(await screen.findByText('Ya existe esa cuenta')).toBeInTheDocument()
  })
})
