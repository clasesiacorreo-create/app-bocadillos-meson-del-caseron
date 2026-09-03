import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormularioLogin } from './FormularioLogin'

vi.mock('@/lib/supabase/cliente-navegador', () => ({
  crearClienteNavegador: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: { message: 'Invalid login credentials' } }),
    },
  }),
}))

describe('FormularioLogin', () => {
  it('avisa si el email o la contraseña son incorrectos', async () => {
    render(<FormularioLogin />)
    await userEvent.type(screen.getByLabelText('Email'), 'cocina@ejemplo.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mal')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Email o contraseña incorrectos.')).toBeInTheDocument()
  })
})
