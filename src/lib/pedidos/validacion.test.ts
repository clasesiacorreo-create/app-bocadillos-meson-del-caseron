import { describe, expect, it } from 'vitest'
import { validarDatosContacto, validarLineas } from './validacion'
import type { Carta } from '@/lib/carta/tipos'
import type { LineaParaCarrito } from '@/lib/carrito/tipos'
import type { DatosContacto, DireccionEntrega } from './tipos'

function carta(parcial: Partial<Carta['categorias'][number]['articulos'][number]> = {}): Carta {
  return {
    categorias: [
      {
        id: 'cat-1',
        nombre: 'Clásicos',
        articulos: [
          {
            id: 'a-lomo',
            nombre: 'Lomo',
            descripcion: '',
            imagenUrl: null,
            disponible: true,
            tamanos: [
              { id: 'tam-bocadillo', nombre: 'Bocadillo', precioCentimos: 500, disponible: true },
              { id: 'tam-montado', nombre: 'Montado', precioCentimos: 400, disponible: false },
            ],
            extras: [
              {
                id: 'e-queso',
                nombre: 'Queso',
                descripcion: '',
                disponible: false,
                precioPorTamanoId: { 'tam-bocadillo': 100, 'tam-montado': 50 },
              },
            ],
            ...parcial,
          },
        ],
      },
    ],
  }
}

function linea(parcial: Partial<LineaParaCarrito> = {}): LineaParaCarrito {
  return {
    articuloId: 'a-lomo',
    nombreArticulo: 'Lomo',
    imagenUrl: null,
    tamanoId: 'tam-bocadillo',
    nombreTamano: 'Bocadillo',
    precioUnitarioCentimos: 500,
    extras: [],
    cantidad: 1,
    notasLinea: '',
    ...parcial,
  }
}

describe('validarLineas', () => {
  it('no encuentra ningún error si todo sigue disponible', () => {
    expect(validarLineas(carta(), [linea()])).toBeNull()
  })

  it('rechaza un artículo desactivado', () => {
    const c = carta({ disponible: false })
    expect(validarLineas(c, [linea()])).toEqual({
      tipo: 'articulo_no_disponible',
      articuloId: 'a-lomo',
      nombreArticulo: 'Lomo',
    })
  })

  it('rechaza un tamaño caído', () => {
    const resultado = validarLineas(carta(), [linea({ tamanoId: 'tam-montado', nombreTamano: 'Montado' })])
    expect(resultado).toEqual({
      tipo: 'articulo_no_disponible',
      articuloId: 'a-lomo',
      nombreArticulo: 'Lomo',
    })
  })

  it('rechaza un complemento caído, identificando cuál', () => {
    const resultado = validarLineas(
      carta(),
      [linea({ extras: [{ extraId: 'e-queso', nombre: 'Queso', precioCentimos: 100 }] })],
    )
    expect(resultado).toEqual({
      tipo: 'extra_no_disponible',
      articuloId: 'a-lomo',
      tamanoId: 'tam-bocadillo',
      extraId: 'e-queso',
      nombreExtra: 'Queso',
    })
  })

  it('rechaza un complemento que ya no existe en la carta', () => {
    const resultado = validarLineas(
      carta(),
      [linea({ extras: [{ extraId: 'e-fantasma', nombre: 'Fantasma', precioCentimos: 100 }] })],
    )
    expect(resultado?.tipo).toBe('extra_no_disponible')
  })

  it('rechaza un artículo que ya no existe en la carta', () => {
    const resultado = validarLineas(carta(), [linea({ articuloId: 'a-fantasma' })])
    expect(resultado).toEqual({
      tipo: 'articulo_no_disponible',
      articuloId: 'a-fantasma',
      nombreArticulo: 'Lomo',
    })
  })

  it('para en la primera línea con problema', () => {
    const resultado = validarLineas(carta({ disponible: false }), [
      linea(),
      linea({ tamanoId: 'tam-montado', nombreTamano: 'Montado' }),
    ])
    expect(resultado?.tipo).toBe('articulo_no_disponible')
  })
})

function contacto(parcial: Partial<DatosContacto> = {}): DatosContacto {
  return { nombre: 'Ana', apellidos: 'García', telefono: '600111222', ...parcial }
}

function direccion(parcial: Partial<DireccionEntrega> = {}): DireccionEntrega {
  return {
    calle: 'C. Hierro',
    numero: '73',
    piso: '',
    cp: '28850',
    ciudad: 'Torrejón de Ardoz',
    indicaciones: '',
    ...parcial,
  }
}

describe('validarDatosContacto', () => {
  it('no encuentra ningún error con datos completos en recogida', () => {
    expect(validarDatosContacto('recogida', contacto(), null)).toBeNull()
  })

  it('no encuentra ningún error con datos completos a domicilio', () => {
    expect(validarDatosContacto('domicilio', contacto(), direccion())).toBeNull()
  })

  it('rechaza un nombre vacío', () => {
    const resultado = validarDatosContacto('recogida', contacto({ nombre: '' }), null)
    expect(resultado).toEqual({ tipo: 'datos_contacto_invalidos', campos: ['Nombre'] })
  })

  it('rechaza un nombre que es solo espacios', () => {
    const resultado = validarDatosContacto('recogida', contacto({ nombre: '   ' }), null)
    expect(resultado).toEqual({ tipo: 'datos_contacto_invalidos', campos: ['Nombre'] })
  })

  it('rechaza apellidos vacíos', () => {
    const resultado = validarDatosContacto('recogida', contacto({ apellidos: '' }), null)
    expect(resultado).toEqual({ tipo: 'datos_contacto_invalidos', campos: ['Apellidos'] })
  })

  it('rechaza un teléfono vacío', () => {
    const resultado = validarDatosContacto('recogida', contacto({ telefono: '' }), null)
    expect(resultado).toEqual({ tipo: 'datos_contacto_invalidos', campos: ['Teléfono'] })
  })

  it('rechaza un teléfono con menos de 9 dígitos', () => {
    const resultado = validarDatosContacto('recogida', contacto({ telefono: '12345' }), null)
    expect(resultado).toEqual({ tipo: 'datos_contacto_invalidos', campos: ['Teléfono (formato no válido)'] })
  })

  it('acepta un teléfono con espacios o prefijo internacional', () => {
    expect(validarDatosContacto('recogida', contacto({ telefono: '+34 600 111 222' }), null)).toBeNull()
  })

  it('acumula varios campos de contacto inválidos a la vez', () => {
    const resultado = validarDatosContacto('recogida', contacto({ nombre: '', telefono: '' }), null)
    expect(resultado).toEqual({ tipo: 'datos_contacto_invalidos', campos: ['Nombre', 'Teléfono'] })
  })

  it('rechaza domicilio sin dirección', () => {
    const resultado = validarDatosContacto('domicilio', contacto(), null)
    expect(resultado).toEqual({ tipo: 'datos_contacto_invalidos', campos: ['Dirección'] })
  })

  it('rechaza una calle vacía a domicilio', () => {
    const resultado = validarDatosContacto('domicilio', contacto(), direccion({ calle: '' }))
    expect(resultado).toEqual({ tipo: 'datos_contacto_invalidos', campos: ['Calle'] })
  })

  it('rechaza un número, código postal o ciudad vacíos a domicilio', () => {
    const resultado = validarDatosContacto(
      'domicilio',
      contacto(),
      direccion({ numero: '', cp: '', ciudad: '' }),
    )
    expect(resultado).toEqual({ tipo: 'datos_contacto_invalidos', campos: ['Número', 'Código postal', 'Ciudad'] })
  })

  it('no exige piso ni indicaciones a domicilio', () => {
    expect(validarDatosContacto('domicilio', contacto(), direccion({ piso: '', indicaciones: '' }))).toBeNull()
  })

  it('no exige dirección en recogida aunque venga null', () => {
    expect(validarDatosContacto('recogida', contacto(), null)).toBeNull()
  })
})
