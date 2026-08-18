# Cimientos, carta pública y carrito — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar en pie el proyecto, la base de datos con la carta real cargada, y una web pública en la que un cliente navega la carta desde el móvil y monta un pedido en el carrito.

**Architecture:** Proyecto único Next.js (App Router, TypeScript) con Supabase Cloud como base de datos. La lógica que puede hacer perder dinero —cálculo de precios y reglas de disponibilidad— vive en módulos puros sin base de datos ni red, probados con Vitest. La carta se lee en el servidor; el carrito vive en el navegador con persistencia local.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Supabase (Postgres), Zustand, Vitest, Testing Library, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-19-pedidos-horno-caseron-design.md`

## Global Constraints

- **Gestor de paquetes: pnpm.** Nunca `npm` ni `npx`. En su lugar `pnpm` y `pnpx`. Aplica también a scripts de `package.json`, documentación y CI.
- **Importes siempre en céntimos enteros.** Nunca euros en coma flotante. La conversión a texto ocurre solo al pintar.
- **Zona horaria de referencia: `Europe/Madrid`.**
- **Idioma de la interfaz y del código de dominio: español.** Nombres de variables, tablas y funciones en español, sin acentos en identificadores.
- **En la web pública no aparecen nombres propios.** Se dice "El Horno del Caserón" o "el restaurante", nunca "Javier".
- **Los artículos y complementos no disponibles se muestran atenuados, nunca se ocultan.**
- **Datos del restaurante:** C. Hierro, 73, LOC, 28850 Torrejón de Ardoz, Madrid · 916 78 04 35.
- **Las integraciones nativas (MCP) de Supabase y Vercel no se usan.** Están conectadas a cuentas distintas. Todo se hace por CLI y código, y cualquier paso que toque la cuenta del usuario se detiene a preguntar primero.

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/lib/dinero/index.ts` | Formato de importes en céntimos a texto es-ES. Sin dependencias. |
| `src/lib/precios/tipos.ts` | Tipos del cálculo: línea, reglas, resumen. |
| `src/lib/precios/index.ts` | `precioLinea` y `calcularResumen`. Puro. |
| `src/lib/carta/tipos.ts` | Tipos de dominio de la carta. |
| `src/lib/carta/reglas.ts` | Reglas derivadas de disponibilidad y de extras por tamaño. Puro. |
| `src/lib/carta/consultas.ts` | Lectura de la carta desde Supabase. |
| `src/lib/carrito/tipos.ts` | Tipo de la línea que la ficha entrega al carrito. |
| `src/lib/carrito/store.ts` | Estado del carrito con persistencia local. |
| `src/lib/supabase/cliente-servidor.ts` | Cliente de Supabase para componentes de servidor. |
| `src/lib/supabase/tipos-bd.ts` | Tipos generados desde el esquema. No se edita a mano. |
| `src/components/ui/HojaInferior.tsx` | Hoja inferior reutilizable. |
| `src/components/carta/*` | Pestañas de categoría, tarjeta de artículo, ficha de artículo. |
| `src/components/carrito/*` | Barra fija, hoja de carrito, línea de carrito. |
| `supabase/migrations/*.sql` | Esquema y datos iniciales. |

---

### Tarea 1: Proyecto base y arnés de pruebas

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `vitest.config.ts`
- Create: `src/lib/dinero/index.ts`
- Test: `src/lib/dinero/dinero.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `formatearPrecio(centimos: number): string`, y el comando `pnpm test` funcionando.

- [ ] **Step 1: Crear el proyecto**

```bash
pnpm create next-app@latest . --typescript --tailwind --app --eslint --src-dir --import-alias "@/*" --use-pnpm
```

Si pregunta por Turbopack, acepta el valor por defecto. Si avisa de que el directorio no está vacío, confirma: `Recursos/`, `docs/` y `.gitignore` deben conservarse.

- [ ] **Step 2: Instalar el arnés de pruebas**

```bash
pnpm add -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Configurar Vitest**

Crear `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

Crear `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Añadir a los scripts de `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Escribir el test que falla**

Crear `src/lib/dinero/dinero.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatearPrecio } from '.'

// Ojo: Intl en es-ES separa el importe del símbolo con un espacio duro (U+00A0),
// no con un espacio normal. Si el test se escribe con espacio normal, falla y
// el mensaje de error resulta indistinguible a simple vista.
const ESPACIO_DURO = ' '

describe('formatearPrecio', () => {
  it('formatea céntimos como euros en formato español', () => {
    expect(formatearPrecio(500)).toBe(`5,00${ESPACIO_DURO}€`)
  })

  it('formatea importes con céntimos no redondos', () => {
    expect(formatearPrecio(1150)).toBe(`11,50${ESPACIO_DURO}€`)
  })

  it('formatea el cero', () => {
    expect(formatearPrecio(0)).toBe(`0,00${ESPACIO_DURO}€`)
  })

  it('formatea importes de cuatro cifras', () => {
    expect(formatearPrecio(123456)).toBe(`1234,56${ESPACIO_DURO}€`)
  })
})
```

- [ ] **Step 5: Ejecutar el test y comprobar que falla**

Run: `pnpm test`
Expected: FAIL, no existe el módulo `@/lib/dinero`.

- [ ] **Step 6: Implementar**

Crear `src/lib/dinero/index.ts`:

```ts
const FORMATO = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: false,
})

/** Convierte un importe en céntimos enteros a texto legible: 500 -> "5,00 €". */
export function formatearPrecio(centimos: number): string {
  return FORMATO.format(centimos / 100)
}
```

- [ ] **Step 7: Ejecutar el test y comprobar que pasa**

Run: `pnpm test`
Expected: PASS, 4 tests.

- [ ] **Step 8: Comprobar que el proyecto arranca y compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Añade el proyecto Next.js, el arnés de pruebas y el formato de importes"
```

---

### Tarea 2: Cálculo de precios

**Files:**
- Create: `src/lib/precios/tipos.ts`
- Create: `src/lib/precios/index.ts`
- Test: `src/lib/precios/precios.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `precioLinea(linea: LineaCarrito): number`
  - `calcularResumen(lineas: LineaCarrito[], modoEntrega: ModoEntrega, reglas: ReglasPedido): ResumenPedido`
  - Tipos `ModoEntrega`, `ExtraEnLinea`, `LineaCarrito`, `ReglasPedido`, `ResumenPedido`.

- [ ] **Step 1: Definir los tipos**

Crear `src/lib/precios/tipos.ts`:

```ts
export type ModoEntrega = 'domicilio' | 'recogida'

export type ExtraEnLinea = {
  extraId: string
  nombre: string
  precioCentimos: number
}

export type LineaCarrito = {
  articuloId: string
  tamanoId: string
  precioUnitarioCentimos: number
  extras: ExtraEnLinea[]
  cantidad: number
}

export type ReglasPedido = {
  envioCentimos: number
  pedidoMinimoCentimos: number
  /** null desactiva el envío gratuito por importe: el envío se cobra siempre. */
  envioGratisDesdeCentimos: number | null
}

export type ResumenPedido = {
  subtotalCentimos: number
  envioCentimos: number
  totalCentimos: number
  alcanzaMinimo: boolean
  faltaParaMinimoCentimos: number
  envioEsGratis: boolean
  /** null cuando no procede mostrar el aviso: recogida, umbral desactivado o ya alcanzado. */
  faltaParaEnvioGratisCentimos: number | null
}
```

- [ ] **Step 2: Escribir los tests que fallan**

Crear `src/lib/precios/precios.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { calcularResumen, precioLinea } from '.'
import type { LineaCarrito, ReglasPedido } from './tipos'

const REGLAS: ReglasPedido = {
  envioCentimos: 200,
  pedidoMinimoCentimos: 1000,
  envioGratisDesdeCentimos: 2000,
}

function linea(parcial: Partial<LineaCarrito> = {}): LineaCarrito {
  return {
    articuloId: 'art-1',
    tamanoId: 'tam-1',
    precioUnitarioCentimos: 500,
    extras: [],
    cantidad: 1,
    ...parcial,
  }
}

describe('precioLinea', () => {
  it('cobra el precio del tamaño cuando no hay extras', () => {
    expect(precioLinea(linea())).toBe(500)
  })

  it('suma los extras antes de multiplicar por la cantidad', () => {
    const resultado = precioLinea(
      linea({
        extras: [
          { extraId: 'e1', nombre: 'Queso', precioCentimos: 100 },
          { extraId: 'e2', nombre: 'Rodaja de tomate', precioCentimos: 100 },
        ],
        cantidad: 3,
      }),
    )
    // (500 + 100 + 100) * 3
    expect(resultado).toBe(2100)
  })

  it('devuelve cero si la cantidad es cero', () => {
    expect(precioLinea(linea({ cantidad: 0 }))).toBe(0)
  })
})

describe('calcularResumen a domicilio', () => {
  it('suma las líneas y cobra el envío por debajo del umbral', () => {
    const r = calcularResumen([linea({ precioUnitarioCentimos: 1200 })], 'domicilio', REGLAS)
    expect(r.subtotalCentimos).toBe(1200)
    expect(r.envioCentimos).toBe(200)
    expect(r.totalCentimos).toBe(1400)
    expect(r.envioEsGratis).toBe(false)
  })

  it('no alcanza el mínimo y dice cuánto falta', () => {
    const r = calcularResumen([linea({ precioUnitarioCentimos: 750 })], 'domicilio', REGLAS)
    expect(r.alcanzaMinimo).toBe(false)
    expect(r.faltaParaMinimoCentimos).toBe(250)
  })

  it('alcanza el mínimo justo en el umbral', () => {
    const r = calcularResumen([linea({ precioUnitarioCentimos: 1000 })], 'domicilio', REGLAS)
    expect(r.alcanzaMinimo).toBe(true)
    expect(r.faltaParaMinimoCentimos).toBe(0)
  })

  it('dice cuánto falta para el envío gratuito', () => {
    const r = calcularResumen([linea({ precioUnitarioCentimos: 1750 })], 'domicilio', REGLAS)
    expect(r.envioEsGratis).toBe(false)
    expect(r.faltaParaEnvioGratisCentimos).toBe(250)
  })

  it('regala el envío justo en el umbral', () => {
    const r = calcularResumen([linea({ precioUnitarioCentimos: 2000 })], 'domicilio', REGLAS)
    expect(r.envioEsGratis).toBe(true)
    expect(r.envioCentimos).toBe(0)
    expect(r.totalCentimos).toBe(2000)
    expect(r.faltaParaEnvioGratisCentimos).toBeNull()
  })

  it('cobra siempre el envío si el umbral está desactivado', () => {
    const r = calcularResumen(
      [linea({ precioUnitarioCentimos: 9000 })],
      'domicilio',
      { ...REGLAS, envioGratisDesdeCentimos: null },
    )
    expect(r.envioEsGratis).toBe(false)
    expect(r.envioCentimos).toBe(200)
    expect(r.faltaParaEnvioGratisCentimos).toBeNull()
  })

  it('mide los dos umbrales contra el subtotal, no contra el total', () => {
    // Subtotal 900: con envío el total sería 1100 y superaría el mínimo de 1000.
    // El mínimo debe seguir sin alcanzarse.
    const r = calcularResumen([linea({ precioUnitarioCentimos: 900 })], 'domicilio', REGLAS)
    expect(r.alcanzaMinimo).toBe(false)
  })

  it('devuelve un resumen vacío coherente sin líneas', () => {
    const r = calcularResumen([], 'domicilio', REGLAS)
    expect(r.subtotalCentimos).toBe(0)
    expect(r.alcanzaMinimo).toBe(false)
    expect(r.faltaParaMinimoCentimos).toBe(1000)
  })
})

describe('calcularResumen en recogida', () => {
  it('no cobra envío ni exige mínimo', () => {
    const r = calcularResumen([linea({ precioUnitarioCentimos: 300 })], 'recogida', REGLAS)
    expect(r.envioCentimos).toBe(0)
    expect(r.totalCentimos).toBe(300)
    expect(r.alcanzaMinimo).toBe(true)
    expect(r.faltaParaMinimoCentimos).toBe(0)
    expect(r.faltaParaEnvioGratisCentimos).toBeNull()
  })
})
```

- [ ] **Step 3: Ejecutar los tests y comprobar que fallan**

Run: `pnpm test src/lib/precios`
Expected: FAIL, no existe el módulo.

- [ ] **Step 4: Implementar**

Crear `src/lib/precios/index.ts`:

```ts
import type { LineaCarrito, ModoEntrega, ReglasPedido, ResumenPedido } from './tipos'

export type * from './tipos'

export function precioLinea(linea: LineaCarrito): number {
  const extras = linea.extras.reduce((total, extra) => total + extra.precioCentimos, 0)
  return (linea.precioUnitarioCentimos + extras) * linea.cantidad
}

export function calcularResumen(
  lineas: LineaCarrito[],
  modoEntrega: ModoEntrega,
  reglas: ReglasPedido,
): ResumenPedido {
  const subtotalCentimos = lineas.reduce((total, linea) => total + precioLinea(linea), 0)
  const esRecogida = modoEntrega === 'recogida'
  const umbralEnvioGratis = reglas.envioGratisDesdeCentimos

  // Los dos umbrales se miden contra el subtotal: el cliente no debe alcanzar
  // un umbral pagando gastos de envío, y el de envío gratis no puede depender
  // de un envío que él mismo anula.
  const alcanzaMinimo = esRecogida || subtotalCentimos >= reglas.pedidoMinimoCentimos
  const faltaParaMinimoCentimos = alcanzaMinimo
    ? 0
    : reglas.pedidoMinimoCentimos - subtotalCentimos

  const superaUmbralEnvio = umbralEnvioGratis !== null && subtotalCentimos >= umbralEnvioGratis
  const envioEsGratis = esRecogida || superaUmbralEnvio
  const envioCentimos = envioEsGratis ? 0 : reglas.envioCentimos
  const faltaParaEnvioGratisCentimos =
    esRecogida || umbralEnvioGratis === null || superaUmbralEnvio
      ? null
      : umbralEnvioGratis - subtotalCentimos

  return {
    subtotalCentimos,
    envioCentimos,
    totalCentimos: subtotalCentimos + envioCentimos,
    alcanzaMinimo,
    faltaParaMinimoCentimos,
    envioEsGratis,
    faltaParaEnvioGratisCentimos,
  }
}
```

- [ ] **Step 5: Ejecutar los tests y comprobar que pasan**

Run: `pnpm test src/lib/precios`
Expected: PASS, 13 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/precios
git commit -m "Añade el cálculo de precios con mínimo de pedido y envío gratuito"
```

---

### Tarea 3: Esquema de base de datos

**Files:**
- Create: `supabase/migrations/0001_esquema_carta.sql`
- Create: `.env.example`
- Create: `src/lib/supabase/cliente-servidor.ts`
- Create: `src/lib/supabase/tipos-bd.ts` (generado)

**Interfaces:**
- Consumes: nada.
- Produces: `crearClienteServidor(): SupabaseClient<BaseDeDatos>` y el tipo `BaseDeDatos`.

- [ ] **Step 1: PARADA — confirmar la cuenta de Supabase**

**No continúes sin respuesta del usuario.** Pregúntale:

> Necesito un proyecto de Supabase Cloud para este trabajo. ¿Creas tú el proyecto en el panel de Supabase con la cuenta correcta y me pasas la URL y las claves, o prefieres que lo haga yo por CLI y me confirmas primero qué cuenta está conectada?

Las integraciones nativas de esta sesión apuntan a cuentas distintas y no se usan.

Del proyecto hacen falta: la URL, la clave pública (`anon` o `publishable`, según cómo la nombre el panel) y la clave de servicio (`service_role` o `secret`), además del identificador del proyecto.

- [ ] **Step 2: Guardar las credenciales**

Crear `.env.local` (no se versiona, ya está en `.gitignore`):

```
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Crear `.env.example` con las mismas claves y valores vacíos, y versionarlo.

- [ ] **Step 3: Escribir la migración del esquema**

Crear `supabase/migrations/0001_esquema_carta.sql`:

```sql
create table categorias (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  orden      int  not null default 0,
  activa     boolean not null default true,
  creado_en  timestamptz not null default now()
);

create table tamanos (
  id      uuid primary key default gen_random_uuid(),
  nombre  text not null unique,
  orden   int  not null default 0
);

create table articulos (
  id            uuid primary key default gen_random_uuid(),
  categoria_id  uuid not null references categorias(id) on delete restrict,
  nombre        text not null unique,
  descripcion   text not null default '',
  imagen_url    text,
  disponible    boolean not null default true,
  orden         int  not null default 0,
  creado_en     timestamptz not null default now()
);

create table articulo_tamanos (
  id                uuid primary key default gen_random_uuid(),
  articulo_id       uuid not null references articulos(id) on delete cascade,
  tamano_id         uuid not null references tamanos(id) on delete restrict,
  precio_centimos   int  not null check (precio_centimos >= 0),
  disponible        boolean not null default true,
  unique (articulo_id, tamano_id)
);

create table extras (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null unique,
  descripcion  text not null default '',
  disponible   boolean not null default true,
  orden        int  not null default 0
);

create table extra_precios (
  id               uuid primary key default gen_random_uuid(),
  extra_id         uuid not null references extras(id) on delete cascade,
  tamano_id        uuid not null references tamanos(id) on delete restrict,
  precio_centimos  int  not null check (precio_centimos >= 0),
  unique (extra_id, tamano_id)
);

create table articulo_extras (
  articulo_id  uuid not null references articulos(id) on delete cascade,
  extra_id     uuid not null references extras(id) on delete cascade,
  primary key (articulo_id, extra_id)
);

-- Fila única: la columna id es booleana y solo admite true.
create table ajustes (
  id                           boolean primary key default true check (id),
  nombre_restaurante           text not null,
  telefono                     text not null,
  direccion                    text not null,
  horario                      jsonb not null default '{}'::jsonb,
  envio_centimos               int not null default 200  check (envio_centimos >= 0),
  pedido_minimo_centimos       int not null default 1000 check (pedido_minimo_centimos >= 0),
  envio_gratis_desde_centimos  int check (envio_gratis_desde_centimos >= 0),
  antelacion_minima_min        int not null default 30 check (antelacion_minima_min >= 0),
  duracion_franja_min          int not null default 30 check (duracion_franja_min > 0)
);

create index articulos_categoria_idx        on articulos(categoria_id);
create index articulo_tamanos_articulo_idx  on articulo_tamanos(articulo_id);
create index extra_precios_extra_idx        on extra_precios(extra_id);

-- La carta y los ajustes son de lectura pública. No se define ninguna política
-- de escritura: sin política, la escritura queda denegada para anon y para
-- authenticated. Las políticas del personal llegan con el plan del panel.
alter table categorias       enable row level security;
alter table tamanos          enable row level security;
alter table articulos        enable row level security;
alter table articulo_tamanos enable row level security;
alter table extras           enable row level security;
alter table extra_precios    enable row level security;
alter table articulo_extras  enable row level security;
alter table ajustes          enable row level security;

create policy "lectura publica" on categorias       for select using (true);
create policy "lectura publica" on tamanos          for select using (true);
create policy "lectura publica" on articulos        for select using (true);
create policy "lectura publica" on articulo_tamanos for select using (true);
create policy "lectura publica" on extras           for select using (true);
create policy "lectura publica" on extra_precios    for select using (true);
create policy "lectura publica" on articulo_extras  for select using (true);
create policy "lectura publica" on ajustes          for select using (true);
```

- [ ] **Step 4: Aplicar la migración**

```bash
pnpm add -D supabase
pnpx supabase link --project-ref <identificador-del-proyecto>
pnpx supabase db push
```

Expected: la migración se aplica sin errores.

- [ ] **Step 5: Comprobar que las tablas existen**

```bash
pnpx supabase db push --dry-run
```

Expected: informa de que no hay migraciones pendientes.

- [ ] **Step 6: Generar los tipos**

```bash
pnpx supabase gen types typescript --linked > src/lib/supabase/tipos-bd.ts
```

Comprobar que el fichero contiene `categorias`, `articulos` y `ajustes`. No se edita a mano.

- [ ] **Step 7: Crear el cliente de servidor**

```bash
pnpm add @supabase/supabase-js
```

Crear `src/lib/supabase/cliente-servidor.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './tipos-bd'

export type BaseDeDatos = Database

/**
 * Cliente para componentes y acciones de servidor. Usa la clave pública: solo
 * puede leer lo que las políticas permiten leer a cualquiera, que es la carta.
 */
export function crearClienteServidor() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !clave) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa .env.local.',
    )
  }

  return createClient<BaseDeDatos>(url, clave, { auth: { persistSession: false } })
}
```

- [ ] **Step 8: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 9: Commit**

```bash
git add supabase .env.example src/lib/supabase
git commit -m "Añade el esquema de la carta en Supabase y el cliente de servidor"
```

---

### Tarea 4: Carga de la carta real

**Files:**
- Create: `supabase/migrations/0002_carta_inicial.sql`
- Create: `public/carta/*.jpg` (ocho ficheros)

**Interfaces:**
- Consumes: el esquema de la Tarea 3.
- Produces: base de datos con 7 categorías, 23 artículos, 3 tamaños, 5 complementos y la fila de ajustes.

- [ ] **Step 1: Copiar y renombrar las fotografías**

Las ocho fotos de `Recursos/` corresponden a estos artículos. La correspondencia está identificada a partir del contenido de cada imagen; conviene que el restaurante la confirme, pero no bloquea nada porque se cambia desde el panel.

```bash
mkdir -p public/carta
cd Recursos
cp "WhatsApp Image 2026-08-18 at 18.41.40.jpeg" ../public/carta/lomo.jpg
cp "WhatsApp Image 2026-08-18 at 18.44.18.jpeg" ../public/carta/el-caseron.jpg
cp "WhatsApp Image 2026-08-18 at 18.45.55.jpeg" ../public/carta/pulled-pork-caseron.jpg
cp "WhatsApp Image 2026-08-18 at 18.48.18.jpeg" ../public/carta/la-montanesa.jpg
cp "WhatsApp Image 2026-08-18 at 18.50.06.jpeg" ../public/carta/la-caserona.jpg
cp "WhatsApp Image 2026-08-18 at 18.51.27.jpeg" ../public/carta/vegetal-de-pollo.jpg
cp "WhatsApp Image 2026-08-18 at 18.52.21.jpeg" ../public/carta/beicon.jpg
cp "WhatsApp Image 2026-08-18 at 18.53.56.jpeg" ../public/carta/pollo-a-la-plancha.jpg
cd ..
```

| Foto | Contenido | Artículo |
|---|---|---|
| 18.41.40 | Lomo en pan crujiente con salsa | Lomo |
| 18.44.18 | Pollo, beicon, pimientos y salsa | El Caserón |
| 18.45.55 | Cerdo desmechado con cebolla morada | Pulled Pork Caserón |
| 18.48.18 | Hamburguesa con queso cremoso y cebolla | La Montañesa |
| 18.50.06 | Hamburguesa con queso, cebolla encurtida y tomate | La Caserona |
| 18.51.27 | Pollo, queso, tomate y mezclum | Vegetal de pollo |
| 18.52.21 | Lonchas de beicon | Beicon |
| 18.53.56 | Pechuga de pollo a la plancha | Pollo a la plancha |

- [ ] **Step 2: Escribir la migración de datos**

Crear `supabase/migrations/0002_carta_inicial.sql`. Los artículos se enlazan por nombre, que es único en toda la carta.

```sql
insert into tamanos (nombre, orden) values
  ('Bocadillo', 1), ('Montado', 2), ('Único', 3);

insert into categorias (nombre, orden) values
  ('Clásicos a la plancha', 1),
  ('Ibéricos & embutidos',  2),
  ('Huevos & tortilla',     3),
  ('Del mar',               4),
  ('Gourmet Caserón',       5),
  ('Hamburguesas',          6),
  ('Sándwiches',            7);

insert into articulos (categoria_id, nombre, descripcion, imagen_url, orden)
select c.id, v.nombre, v.descripcion, v.imagen, v.orden
from (values
  ('Clásicos a la plancha','Lomo','Lomo jugoso marcado al punto con pan crujiente','/carta/lomo.jpg',1),
  ('Clásicos a la plancha','Panceta','Crujiente por fuera, tierna por dentro... y muy adictiva',null,2),
  ('Clásicos a la plancha','Pepito de ternera','Filete de ternera dorado, con carácter y sabor profundo',null,3),
  ('Clásicos a la plancha','Pollo a la plancha','Pollo jugoso, fuego vivo y pan recién horneado','/carta/pollo-a-la-plancha.jpg',4),
  ('Clásicos a la plancha','Beicon','Crujiente, jugoso y sabe a puro vicio en cada mordisco','/carta/beicon.jpg',5),
  ('Ibéricos & embutidos','Jamón serrano','Tradición pura, sabor que no necesita adornos',null,1),
  ('Ibéricos & embutidos','Jamón ibérico','Profundidad y elegancia entre pan artesano',null,2),
  ('Ibéricos & embutidos','Chorizo frito','Poderosas especias y textura irresistible',null,3),
  ('Ibéricos & embutidos','Chorizo / salchichón','Aroma delicado, matices suaves en un bocadillo fino',null,4),
  ('Ibéricos & embutidos','Queso curado','Carácter lácteo, crema firme y equilibrio perfecto',null,5),
  ('Huevos & tortilla','Tortilla española','Patata y huevo, jugosa y con sabor casero',null,1),
  ('Huevos & tortilla','Tortilla francesa','Minimalista, esponjosa y elegante en su sencillez',null,2),
  ('Del mar','Calamares a la andaluza','Crujientes y tiernos, el sur de cada bocado',null,1),
  ('Del mar','Rejos fritos','Fritura ligera, sabor auténtico y mucha personalidad',null,2),
  ('Gourmet Caserón','De la casa','Tortilla, lomo, queso, tomate, lechuga, mahonesa trufada',null,1),
  ('Gourmet Caserón','Vegetal de pollo','Pollo plancha, mezclun de lechugas, tomate, queso, césar','/carta/vegetal-de-pollo.jpg',2),
  ('Gourmet Caserón','El Caserón','Pollo plancha, beicon, pimientos, salsa caserón','/carta/el-caseron.jpg',3),
  ('Gourmet Caserón','Pulled Pork Caserón','Cerdo desmechado, salsa barbacoa, queso, lechuga, tomate y cebolla encurtida, salsa chipotle','/carta/pulled-pork-caseron.jpg',4),
  ('Gourmet Caserón','Tex Mex Caserón','Ternera mechada, rodaja de tomate, cebolla encurtida, queso, salsa caserón, cebolla frita',null,5),
  ('Hamburguesas','La Caserona','Carne madurada, salsa caserón, tomate, lechuga, beicon, queso, cebolla encurtida','/carta/la-caserona.jpg',1),
  ('Hamburguesas','La Montañesa','Carne madurada, salsa caserón, tomate, lechuga, queso de cabra, beicon, cebolla caramelizada','/carta/la-montanesa.jpg',2),
  ('Sándwiches','Sándwich mixto','Pan crujiente, jamón del bueno y queso fundido que sabe a casa y a ganas',null,1),
  ('Sándwiches','Sándwich Breakfast Caserón','Tortilla francesa, beicon crujiente, queso fundido, tomate y salsa caserón',null,2)
) as v(categoria, nombre, descripcion, imagen, orden)
join categorias c on c.nombre = v.categoria;

insert into articulo_tamanos (articulo_id, tamano_id, precio_centimos)
select a.id, t.id, v.precio
from (values
  ('Lomo','Bocadillo',500),                      ('Lomo','Montado',400),
  ('Panceta','Bocadillo',500),                   ('Panceta','Montado',400),
  ('Pepito de ternera','Bocadillo',650),
  ('Pollo a la plancha','Bocadillo',500),        ('Pollo a la plancha','Montado',400),
  ('Beicon','Bocadillo',450),                    ('Beicon','Montado',350),
  ('Jamón serrano','Bocadillo',450),             ('Jamón serrano','Montado',350),
  ('Jamón ibérico','Bocadillo',650),             ('Jamón ibérico','Montado',500),
  ('Chorizo frito','Bocadillo',550),             ('Chorizo frito','Montado',450),
  ('Chorizo / salchichón','Bocadillo',400),      ('Chorizo / salchichón','Montado',300),
  ('Queso curado','Bocadillo',400),              ('Queso curado','Montado',300),
  ('Tortilla española','Bocadillo',450),         ('Tortilla española','Montado',300),
  ('Tortilla francesa','Bocadillo',400),         ('Tortilla francesa','Montado',300),
  ('Calamares a la andaluza','Bocadillo',700),   ('Calamares a la andaluza','Montado',550),
  ('Rejos fritos','Bocadillo',700),              ('Rejos fritos','Montado',550),
  ('De la casa','Bocadillo',700),                ('De la casa','Montado',550),
  ('Vegetal de pollo','Bocadillo',650),          ('Vegetal de pollo','Montado',500),
  ('El Caserón','Bocadillo',700),                ('El Caserón','Montado',600),
  ('Pulled Pork Caserón','Bocadillo',650),       ('Pulled Pork Caserón','Montado',500),
  ('Tex Mex Caserón','Bocadillo',650),           ('Tex Mex Caserón','Montado',500),
  ('La Caserona','Único',1050),
  ('La Montañesa','Único',1150),
  ('Sándwich mixto','Único',400),
  ('Sándwich Breakfast Caserón','Único',500)
) as v(articulo, tamano, precio)
join articulos a on a.nombre = v.articulo
join tamanos   t on t.nombre = v.tamano;

insert into extras (nombre, descripcion, orden) values
  ('Queso',                 'Derretido y sabroso', 1),
  ('Cebolla caramelizada',  'Dulzor equilibrado', 2),
  ('Pimientos fritos',      'Acompañamiento clásico con esencia de cocina casera', 3),
  ('Salsa',                 'Mayonesa, césar o caserón', 4),
  ('Rodaja de tomate',      'Fresco y vibrante', 5);

-- Los extras solo tienen precio en bocadillo y montado. Al no tener precio para
-- el tamaño Único, las hamburguesas y los sándwiches no ofrecen complementos.
insert into extra_precios (extra_id, tamano_id, precio_centimos)
select e.id, t.id, case t.nombre when 'Bocadillo' then 100 else 50 end
from extras e
cross join tamanos t
where t.nombre in ('Bocadillo', 'Montado');

-- Cada artículo con bocadillo o montado ofrece todos los complementos.
insert into articulo_extras (articulo_id, extra_id)
select a.id, e.id
from articulos a
cross join extras e
where exists (
  select 1 from articulo_tamanos at
  join tamanos t on t.id = at.tamano_id
  where at.articulo_id = a.id and t.nombre in ('Bocadillo', 'Montado')
);

insert into ajustes (
  id, nombre_restaurante, telefono, direccion, horario,
  envio_centimos, pedido_minimo_centimos, envio_gratis_desde_centimos,
  antelacion_minima_min, duracion_franja_min
) values (
  true,
  'El Horno del Caserón',
  '916 78 04 35',
  'C. Hierro, 73, LOC, 28850 Torrejón de Ardoz, Madrid',
  '{
     "lunes":     [{"desde":"13:00","hasta":"16:00"},{"desde":"20:00","hasta":"23:30"}],
     "martes":    [{"desde":"13:00","hasta":"16:00"},{"desde":"20:00","hasta":"23:30"}],
     "miercoles": [{"desde":"13:00","hasta":"16:00"},{"desde":"20:00","hasta":"23:30"}],
     "jueves":    [{"desde":"13:00","hasta":"16:00"},{"desde":"20:00","hasta":"23:30"}],
     "viernes":   [{"desde":"13:00","hasta":"16:00"},{"desde":"20:00","hasta":"23:30"}],
     "sabado":    [{"desde":"13:00","hasta":"16:00"},{"desde":"20:00","hasta":"23:30"}],
     "domingo":   []
   }'::jsonb,
  200, 1000, 2000, 30, 30
);
```

El horario es una suposición razonable de partida; el restaurante lo corregirá desde el panel.

- [ ] **Step 3: Aplicar la migración**

```bash
pnpx supabase db push
```

Expected: se aplica sin errores.

- [ ] **Step 4: Comprobar los datos**

```bash
pnpx supabase db push --dry-run
```

Y en el editor SQL del panel de Supabase, comprobar los recuentos:

```sql
select
  (select count(*) from categorias)       as categorias,        -- 7
  (select count(*) from articulos)        as articulos,         -- 23
  (select count(*) from articulo_tamanos) as tamanos_asignados, -- 42
  (select count(*) from extras)           as extras,            -- 5
  (select count(*) from extra_precios)    as precios_extras,    -- 10
  (select count(*) from ajustes)          as ajustes;           -- 1
```

Expected: exactamente esos números. `articulo_tamanos` son 42: 19 artículos con dos tamaños más 4 con tamaño único.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0002_carta_inicial.sql public/carta
git commit -m "Carga la carta real, las fotografías y los ajustes del restaurante"
```

---

### Tarea 5: Lectura de la carta y reglas de disponibilidad

**Files:**
- Create: `src/lib/carta/tipos.ts`
- Create: `src/lib/carta/reglas.ts`
- Create: `src/lib/carta/consultas.ts`
- Test: `src/lib/carta/reglas.test.ts`

**Interfaces:**
- Consumes: `crearClienteServidor` de la Tarea 3.
- Produces:
  - Tipos `TamanoDeArticulo`, `ExtraDeArticulo`, `ArticuloCarta`, `CategoriaCarta`, `Carta`, `ReglasCarta`.
  - `articuloDisponible(articulo: ArticuloCarta): boolean`
  - `extrasParaTamano(articulo: ArticuloCarta, tamanoId: string): ExtraDeArticulo[]`
  - `obtenerCarta(): Promise<Carta>`
  - `obtenerReglas(): Promise<ReglasPedido>`

- [ ] **Step 1: Definir los tipos**

Crear `src/lib/carta/tipos.ts`:

```ts
export type TamanoDeArticulo = {
  id: string
  nombre: string
  precioCentimos: number
  disponible: boolean
}

export type ExtraDeArticulo = {
  id: string
  nombre: string
  descripcion: string
  disponible: boolean
  /** Precio por identificador de tamaño. Si falta el tamaño, el extra no se ofrece ahí. */
  precioPorTamanoId: Record<string, number>
}

export type ArticuloCarta = {
  id: string
  nombre: string
  descripcion: string
  imagenUrl: string | null
  disponible: boolean
  tamanos: TamanoDeArticulo[]
  extras: ExtraDeArticulo[]
}

export type CategoriaCarta = {
  id: string
  nombre: string
  articulos: ArticuloCarta[]
}

export type Carta = {
  categorias: CategoriaCarta[]
}
```

- [ ] **Step 2: Escribir los tests que fallan**

Crear `src/lib/carta/reglas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { articuloDisponible, extrasParaTamano } from './reglas'
import type { ArticuloCarta } from './tipos'

const QUESO = {
  id: 'e-queso',
  nombre: 'Queso',
  descripcion: 'Derretido y sabroso',
  disponible: true,
  precioPorTamanoId: { 'tam-bocadillo': 100, 'tam-montado': 50 },
}

const CEBOLLA = {
  id: 'e-cebolla',
  nombre: 'Cebolla caramelizada',
  descripcion: 'Dulzor equilibrado',
  disponible: false,
  precioPorTamanoId: { 'tam-bocadillo': 100, 'tam-montado': 50 },
}

function articulo(parcial: Partial<ArticuloCarta> = {}): ArticuloCarta {
  return {
    id: 'a-1',
    nombre: 'Lomo',
    descripcion: '',
    imagenUrl: null,
    disponible: true,
    tamanos: [
      { id: 'tam-bocadillo', nombre: 'Bocadillo', precioCentimos: 500, disponible: true },
      { id: 'tam-montado', nombre: 'Montado', precioCentimos: 400, disponible: true },
    ],
    extras: [QUESO, CEBOLLA],
    ...parcial,
  }
}

describe('articuloDisponible', () => {
  it('está disponible si el artículo lo está y tiene algún tamaño disponible', () => {
    expect(articuloDisponible(articulo())).toBe(true)
  })

  it('no está disponible si el artículo está desactivado', () => {
    expect(articuloDisponible(articulo({ disponible: false }))).toBe(false)
  })

  it('no está disponible si ningún tamaño lo está', () => {
    const sinTamanos = articulo({
      tamanos: [
        { id: 'tam-bocadillo', nombre: 'Bocadillo', precioCentimos: 500, disponible: false },
        { id: 'tam-montado', nombre: 'Montado', precioCentimos: 400, disponible: false },
      ],
    })
    expect(articuloDisponible(sinTamanos)).toBe(false)
  })

  it('sigue disponible si le queda un solo tamaño', () => {
    const soloMontado = articulo({
      tamanos: [
        { id: 'tam-bocadillo', nombre: 'Bocadillo', precioCentimos: 500, disponible: false },
        { id: 'tam-montado', nombre: 'Montado', precioCentimos: 400, disponible: true },
      ],
    })
    expect(articuloDisponible(soloMontado)).toBe(true)
  })
})

describe('extrasParaTamano', () => {
  it('devuelve los extras con precio para ese tamaño, disponibles o no', () => {
    const resultado = extrasParaTamano(articulo(), 'tam-bocadillo')
    expect(resultado.map((e) => e.id)).toEqual(['e-queso', 'e-cebolla'])
  })

  it('conserva el estado de disponibilidad para poder atenuarlos', () => {
    const resultado = extrasParaTamano(articulo(), 'tam-bocadillo')
    expect(resultado.find((e) => e.id === 'e-cebolla')?.disponible).toBe(false)
  })

  it('no devuelve extras sin precio para ese tamaño', () => {
    const hamburguesa = articulo({
      tamanos: [{ id: 'tam-unico', nombre: 'Único', precioCentimos: 1050, disponible: true }],
    })
    expect(extrasParaTamano(hamburguesa, 'tam-unico')).toEqual([])
  })
})
```

- [ ] **Step 3: Ejecutar los tests y comprobar que fallan**

Run: `pnpm test src/lib/carta`
Expected: FAIL, no existe `./reglas`.

- [ ] **Step 4: Implementar las reglas**

Crear `src/lib/carta/reglas.ts`:

```ts
import type { ArticuloCarta, ExtraDeArticulo } from './tipos'

/**
 * Un artículo se puede pedir si está activo y le queda al menos un tamaño.
 * Sin ningún tamaño disponible no hay nada que añadir al carrito, así que se
 * comporta como si el artículo entero estuviera desactivado.
 */
export function articuloDisponible(articulo: ArticuloCarta): boolean {
  return articulo.disponible && articulo.tamanos.some((tamano) => tamano.disponible)
}

/**
 * Complementos que se ofrecen para un tamaño concreto. Se devuelven también los
 * no disponibles: la interfaz los muestra atenuados en lugar de ocultarlos, para
 * que el cliente vea que hoy no los hay en vez de pensar que la carta cambió.
 */
export function extrasParaTamano(
  articulo: ArticuloCarta,
  tamanoId: string,
): ExtraDeArticulo[] {
  return articulo.extras.filter((extra) => tamanoId in extra.precioPorTamanoId)
}
```

- [ ] **Step 5: Ejecutar los tests y comprobar que pasan**

Run: `pnpm test src/lib/carta`
Expected: PASS, 7 tests.

- [ ] **Step 6: Implementar la consulta**

Crear `src/lib/carta/consultas.ts`:

```ts
import { crearClienteServidor } from '@/lib/supabase/cliente-servidor'
import type { ReglasPedido } from '@/lib/precios/tipos'
import type { Carta, ExtraDeArticulo } from './tipos'

export async function obtenerCarta(): Promise<Carta> {
  const supabase = crearClienteServidor()

  const [categorias, extras] = await Promise.all([
    supabase
      .from('categorias')
      .select(
        `id, nombre, orden,
         articulos ( id, nombre, descripcion, imagen_url, disponible, orden,
           articulo_tamanos ( precio_centimos, disponible,
             tamanos ( id, nombre, orden ) ),
           articulo_extras ( extra_id ) )`,
      )
      .eq('activa', true)
      .order('orden'),
    supabase
      .from('extras')
      .select('id, nombre, descripcion, disponible, orden, extra_precios ( tamano_id, precio_centimos )')
      .order('orden'),
  ])

  if (categorias.error) throw categorias.error
  if (extras.error) throw extras.error

  const extrasPorId = new Map<string, ExtraDeArticulo>(
    extras.data.map((extra) => [
      extra.id,
      {
        id: extra.id,
        nombre: extra.nombre,
        descripcion: extra.descripcion,
        disponible: extra.disponible,
        precioPorTamanoId: Object.fromEntries(
          extra.extra_precios.map((precio) => [precio.tamano_id, precio.precio_centimos]),
        ),
      },
    ]),
  )

  return {
    categorias: categorias.data.map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre,
      articulos: [...categoria.articulos]
        .sort((a, b) => a.orden - b.orden)
        .map((articulo) => ({
          id: articulo.id,
          nombre: articulo.nombre,
          descripcion: articulo.descripcion,
          imagenUrl: articulo.imagen_url,
          disponible: articulo.disponible,
          tamanos: [...articulo.articulo_tamanos]
            .sort((a, b) => a.tamanos.orden - b.tamanos.orden)
            .map((asignado) => ({
              id: asignado.tamanos.id,
              nombre: asignado.tamanos.nombre,
              precioCentimos: asignado.precio_centimos,
              disponible: asignado.disponible,
            })),
          extras: articulo.articulo_extras
            .map((enlace) => extrasPorId.get(enlace.extra_id))
            .filter((extra): extra is ExtraDeArticulo => extra !== undefined),
        })),
    })),
  }
}

export async function obtenerReglas(): Promise<ReglasPedido> {
  const supabase = crearClienteServidor()
  const { data, error } = await supabase
    .from('ajustes')
    .select('envio_centimos, pedido_minimo_centimos, envio_gratis_desde_centimos')
    .single()

  if (error) throw error

  return {
    envioCentimos: data.envio_centimos,
    pedidoMinimoCentimos: data.pedido_minimo_centimos,
    envioGratisDesdeCentimos: data.envio_gratis_desde_centimos,
  }
}
```

- [ ] **Step 7: Comprobar la consulta contra la base de datos real**

Crear un fichero temporal `comprobar-carta.ts` en la raíz. Tiene que ser `.ts` y
ejecutarse con `tsx`: un `.mjs` no resolvería el alias `@/` que usa `consultas.ts`.

```ts
import { config } from 'dotenv'
config({ path: '.env.local' })

import { obtenerCarta } from '@/lib/carta/consultas'

const carta = await obtenerCarta()
console.log('categorías:', carta.categorias.length)
console.log('artículos:', carta.categorias.flatMap((c) => c.articulos).length)
console.log(JSON.stringify(carta.categorias[0].articulos[0], null, 2))
```

```bash
pnpm add -D dotenv tsx
pnpx tsx comprobar-carta.ts
```

Expected: 7 categorías, 23 artículos, y el primer artículo con sus dos tamaños y cinco extras.

Borrar el fichero al terminar: `rm comprobar-carta.ts`

- [ ] **Step 8: Commit**

```bash
git add src/lib/carta package.json pnpm-lock.yaml
git commit -m "Añade la lectura de la carta y las reglas de disponibilidad"
```

---

### Tarea 6: Página de carta

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/components/carta/PestanasCategorias.tsx`
- Create: `src/components/carta/TarjetaArticulo.tsx`
- Create: `src/components/carta/VistaCarta.tsx`
- Modify: `src/app/layout.tsx`
- Test: `src/components/carta/TarjetaArticulo.test.tsx`

**Interfaces:**
- Consumes: `obtenerCarta`, `articuloDisponible`, `formatearPrecio`.
- Produces: `<TarjetaArticulo articulo={...} onAbrir={...} />` y `<PestanasCategorias categorias={...} />`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/components/carta/TarjetaArticulo.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TarjetaArticulo } from './TarjetaArticulo'
import type { ArticuloCarta } from '@/lib/carta/tipos'

function articulo(parcial: Partial<ArticuloCarta> = {}): ArticuloCarta {
  return {
    id: 'a-1',
    nombre: 'Lomo',
    descripcion: 'Lomo jugoso marcado al punto con pan crujiente',
    imagenUrl: null,
    disponible: true,
    tamanos: [
      { id: 't-b', nombre: 'Bocadillo', precioCentimos: 500, disponible: true },
      { id: 't-m', nombre: 'Montado', precioCentimos: 400, disponible: true },
    ],
    extras: [],
    ...parcial,
  }
}

describe('TarjetaArticulo', () => {
  it('muestra el nombre, la descripción y el precio más bajo', () => {
    render(<TarjetaArticulo articulo={articulo()} onAbrir={vi.fn()} />)
    expect(screen.getByText('Lomo')).toBeInTheDocument()
    expect(screen.getByText(/Lomo jugoso/)).toBeInTheDocument()
    expect(screen.getByText(/desde 4,00/)).toBeInTheDocument()
  })

  it('marca los artículos no disponibles y no deja abrirlos', () => {
    render(<TarjetaArticulo articulo={articulo({ disponible: false })} onAbrir={vi.fn()} />)
    expect(screen.getByText('Hoy no disponible')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lomo/ })).toBeDisabled()
  })

  it('no se puede abrir si ningún tamaño está disponible', () => {
    const sinTamanos = articulo({
      tamanos: [
        { id: 't-b', nombre: 'Bocadillo', precioCentimos: 500, disponible: false },
        { id: 't-m', nombre: 'Montado', precioCentimos: 400, disponible: false },
      ],
    })
    render(<TarjetaArticulo articulo={sinTamanos} onAbrir={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Lomo/ })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm test src/components/carta`
Expected: FAIL, no existe `TarjetaArticulo`.

- [ ] **Step 3: Implementar la tarjeta**

Crear `src/components/carta/TarjetaArticulo.tsx`:

```tsx
'use client'

import Image from 'next/image'
import { articuloDisponible } from '@/lib/carta/reglas'
import type { ArticuloCarta } from '@/lib/carta/tipos'
import { formatearPrecio } from '@/lib/dinero'

type Props = {
  articulo: ArticuloCarta
  onAbrir: (articulo: ArticuloCarta) => void
}

export function TarjetaArticulo({ articulo, onAbrir }: Props) {
  const disponible = articuloDisponible(articulo)
  const precioMinimo = Math.min(...articulo.tamanos.map((t) => t.precioCentimos))

  return (
    <button
      type="button"
      disabled={!disponible}
      onClick={() => onAbrir(articulo)}
      aria-label={articulo.nombre}
      className={`flex w-full gap-3 rounded-xl border border-neutral-800 p-3 text-left transition
        ${disponible ? 'active:scale-[0.99]' : 'opacity-50'}`}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-amber-900/30">
        {articulo.imagenUrl && (
          <Image src={articulo.imagenUrl} alt="" fill sizes="80px" className="object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{articulo.nombre}</h3>
        <p className="line-clamp-2 text-sm text-neutral-400">{articulo.descripcion}</p>
        <p className="mt-1 text-sm font-medium">
          {articulo.tamanos.length > 1
            ? `desde ${formatearPrecio(precioMinimo)}`
            : formatearPrecio(precioMinimo)}
        </p>
        {!disponible && (
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-500">
            Hoy no disponible
          </p>
        )}
      </div>
    </button>
  )
}
```

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `pnpm test src/components/carta`
Expected: PASS, 3 tests.

- [ ] **Step 5: Implementar las pestañas de categoría**

Crear `src/components/carta/PestanasCategorias.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { ArticuloCarta, CategoriaCarta } from '@/lib/carta/tipos'
import { TarjetaArticulo } from './TarjetaArticulo'

type Props = {
  categorias: CategoriaCarta[]
  onAbrirArticulo: (articulo: ArticuloCarta) => void
}

export function PestanasCategorias({ categorias, onAbrirArticulo }: Props) {
  const [activa, setActiva] = useState(categorias[0]?.id ?? '')
  const categoria = categorias.find((c) => c.id === activa) ?? categorias[0]

  return (
    <>
      <nav
        aria-label="Categorías de la carta"
        className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-neutral-950/90 px-4 py-3 backdrop-blur"
      >
        {categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiva(c.id)}
            aria-current={c.id === categoria?.id}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition
              ${c.id === categoria?.id ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800'}`}
          >
            {c.nombre}
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-3 pb-28">
        {categoria?.articulos.map((articulo) => (
          <TarjetaArticulo key={articulo.id} articulo={articulo} onAbrir={onAbrirArticulo} />
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 6: Montar la página**

Reemplazar `src/app/page.tsx`:

```tsx
import { obtenerCarta } from '@/lib/carta/consultas'
import { VistaCarta } from '@/components/carta/VistaCarta'

export const revalidate = 60

export default async function PaginaCarta() {
  const carta = await obtenerCarta()

  return (
    <main className="mx-auto max-w-lg px-4">
      <header className="py-6">
        <h1 className="text-2xl font-bold tracking-tight">El Horno del Caserón</h1>
        <p className="text-sm text-neutral-400">Asador y casa de comidas · Torrejón de Ardoz</p>
      </header>
      <VistaCarta carta={carta} />
    </main>
  )
}
```

Crear `src/components/carta/VistaCarta.tsx`, que por ahora solo enlaza las pestañas y guarda el artículo abierto. La ficha llega en la Tarea 7.

```tsx
'use client'

import { useState } from 'react'
import type { ArticuloCarta, Carta } from '@/lib/carta/tipos'
import { PestanasCategorias } from './PestanasCategorias'

export function VistaCarta({ carta }: { carta: Carta }) {
  const [abierto, setAbierto] = useState<ArticuloCarta | null>(null)

  return (
    <>
      <PestanasCategorias categorias={carta.categorias} onAbrirArticulo={setAbierto} />
      {abierto && <p className="sr-only">Artículo abierto: {abierto.nombre}</p>}
    </>
  )
}
```

- [ ] **Step 7: Ajustar el layout**

En `src/app/layout.tsx`, poner `lang="es"` en `<html>`, el título "El Horno del Caserón · Pedidos a domicilio" y fondo oscuro en el `<body>`:

```tsx
<body className="bg-neutral-950 text-neutral-100 antialiased">
```

Y en `next.config.ts` no hace falta nada: las imágenes viven en `public/`.

- [ ] **Step 8: Ver la carta en el navegador**

Run: `pnpm dev` y abrir `http://localhost:3000` con el navegador en tamaño móvil.
Expected: siete pestañas de categoría, artículos con foto donde la haya, precios en formato español.

- [ ] **Step 9: Commit**

```bash
git add src/app src/components/carta
git commit -m "Añade la página de carta con pestañas de categoría y tarjetas de artículo"
```

---

### Tarea 7: Ficha de artículo

**Files:**
- Create: `src/lib/carrito/tipos.ts`
- Create: `src/components/ui/HojaInferior.tsx`
- Create: `src/components/carta/FichaArticulo.tsx`
- Modify: `src/components/carta/VistaCarta.tsx`
- Test: `src/components/carta/FichaArticulo.test.tsx`

**Interfaces:**
- Consumes: `extrasParaTamano`, `precioLinea`, `formatearPrecio`.
- Produces: `<FichaArticulo articulo={...} onCerrar={...} onAnadir={(linea: LineaParaCarrito) => void} />`, con el tipo declarado en `src/lib/carrito/tipos.ts` (una capa de dominio no debe importar tipos desde un componente, y el carrito de la Tarea 8 necesita este tipo):

```ts
export type LineaParaCarrito = {
  articuloId: string
  nombreArticulo: string
  imagenUrl: string | null
  tamanoId: string
  nombreTamano: string
  precioUnitarioCentimos: number
  extras: { extraId: string; nombre: string; precioCentimos: number }[]
  cantidad: number
  notasLinea: string
}
```

- [ ] **Step 1: Escribir el test que falla**

Crear `src/components/carta/FichaArticulo.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FichaArticulo } from './FichaArticulo'
import type { ArticuloCarta } from '@/lib/carta/tipos'

const ARTICULO: ArticuloCarta = {
  id: 'a-1',
  nombre: 'Lomo',
  descripcion: 'Lomo jugoso',
  imagenUrl: null,
  disponible: true,
  tamanos: [
    { id: 't-b', nombre: 'Bocadillo', precioCentimos: 500, disponible: true },
    { id: 't-m', nombre: 'Montado', precioCentimos: 400, disponible: true },
  ],
  extras: [
    {
      id: 'e-queso',
      nombre: 'Queso',
      descripcion: '',
      disponible: true,
      precioPorTamanoId: { 't-b': 100, 't-m': 50 },
    },
    {
      id: 'e-cebolla',
      nombre: 'Cebolla caramelizada',
      descripcion: '',
      disponible: false,
      precioPorTamanoId: { 't-b': 100, 't-m': 50 },
    },
  ],
}

describe('FichaArticulo', () => {
  it('parte del primer tamaño disponible', () => {
    render(<FichaArticulo articulo={ARTICULO} onCerrar={vi.fn()} onAnadir={vi.fn()} />)
    expect(screen.getByRole('radio', { name: /Bocadillo/ })).toBeChecked()
  })

  it('recalcula el total al cambiar de tamaño', async () => {
    const usuario = userEvent.setup()
    render(<FichaArticulo articulo={ARTICULO} onCerrar={vi.fn()} onAnadir={vi.fn()} />)
    await usuario.click(screen.getByRole('radio', { name: /Montado/ }))
    expect(screen.getByRole('button', { name: /Añadir/ })).toHaveTextContent('4,00')
  })

  it('suma los extras marcados al total', async () => {
    const usuario = userEvent.setup()
    render(<FichaArticulo articulo={ARTICULO} onCerrar={vi.fn()} onAnadir={vi.fn()} />)
    await usuario.click(screen.getByRole('checkbox', { name: /Queso/ }))
    expect(screen.getByRole('button', { name: /Añadir/ })).toHaveTextContent('6,00')
  })

  it('muestra los extras no disponibles atenuados y sin poder marcarlos', () => {
    render(<FichaArticulo articulo={ARTICULO} onCerrar={vi.fn()} onAnadir={vi.fn()} />)
    expect(screen.getByRole('checkbox', { name: /Cebolla caramelizada/ })).toBeDisabled()
    expect(screen.getByText('Hoy no disponible')).toBeInTheDocument()
  })

  it('entrega la línea completa al añadir', async () => {
    const usuario = userEvent.setup()
    const onAnadir = vi.fn()
    render(<FichaArticulo articulo={ARTICULO} onCerrar={vi.fn()} onAnadir={onAnadir} />)

    await usuario.click(screen.getByRole('checkbox', { name: /Queso/ }))
    await usuario.click(screen.getByRole('button', { name: 'Aumentar cantidad' }))
    await usuario.type(screen.getByLabelText(/Nota/), 'sin tomate')
    await usuario.click(screen.getByRole('button', { name: /Añadir/ }))

    expect(onAnadir).toHaveBeenCalledWith({
      articuloId: 'a-1',
      nombreArticulo: 'Lomo',
      imagenUrl: null,
      tamanoId: 't-b',
      nombreTamano: 'Bocadillo',
      precioUnitarioCentimos: 500,
      extras: [{ extraId: 'e-queso', nombre: 'Queso', precioCentimos: 100 }],
      cantidad: 2,
      notasLinea: 'sin tomate',
    })
  })

  it('descarta los extras al cambiar a un tamaño sin ese precio', async () => {
    const usuario = userEvent.setup()
    const onAnadir = vi.fn()
    const conTamanoUnico: ArticuloCarta = {
      ...ARTICULO,
      tamanos: [
        { id: 't-b', nombre: 'Bocadillo', precioCentimos: 500, disponible: true },
        { id: 't-u', nombre: 'Único', precioCentimos: 900, disponible: true },
      ],
    }
    render(<FichaArticulo articulo={conTamanoUnico} onCerrar={vi.fn()} onAnadir={onAnadir} />)

    await usuario.click(screen.getByRole('checkbox', { name: /Queso/ }))
    await usuario.click(screen.getByRole('radio', { name: /Único/ }))
    await usuario.click(screen.getByRole('button', { name: /Añadir/ }))

    expect(onAnadir.mock.calls[0][0].extras).toEqual([])
  })
})
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm test src/components/carta/FichaArticulo`
Expected: FAIL, no existe `FichaArticulo`.

- [ ] **Step 3: Declarar el tipo de la línea**

Crear `src/lib/carrito/tipos.ts`:

```ts
export type ExtraElegido = {
  extraId: string
  nombre: string
  precioCentimos: number
}

/** Lo que la ficha de artículo entrega al carrito al pulsar «Añadir». */
export type LineaParaCarrito = {
  articuloId: string
  nombreArticulo: string
  imagenUrl: string | null
  tamanoId: string
  nombreTamano: string
  precioUnitarioCentimos: number
  extras: ExtraElegido[]
  cantidad: number
  notasLinea: string
}
```

- [ ] **Step 4: Implementar la hoja inferior**

Crear `src/components/ui/HojaInferior.tsx`:

```tsx
'use client'

import { useEffect, type ReactNode } from 'react'

type Props = {
  titulo: string
  onCerrar: () => void
  children: ReactNode
}

export function HojaInferior({ titulo, onCerrar, children }: Props) {
  useEffect(() => {
    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPulsarTecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alPulsarTecla)
      document.body.style.overflow = ''
    }
  }, [onCerrar])

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onCerrar}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-neutral-900 p-4 pb-8"
      >
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Implementar la ficha**

Crear `src/components/carta/FichaArticulo.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { HojaInferior } from '@/components/ui/HojaInferior'
import { extrasParaTamano } from '@/lib/carta/reglas'
import type { ArticuloCarta } from '@/lib/carta/tipos'
import { formatearPrecio } from '@/lib/dinero'
import { precioLinea } from '@/lib/precios'
import type { LineaParaCarrito } from '@/lib/carrito/tipos'

type Props = {
  articulo: ArticuloCarta
  onCerrar: () => void
  onAnadir: (linea: LineaParaCarrito) => void
}

export function FichaArticulo({ articulo, onCerrar, onAnadir }: Props) {
  const tamanosDisponibles = articulo.tamanos.filter((t) => t.disponible)
  const [tamanoId, setTamanoId] = useState(tamanosDisponibles[0]?.id ?? '')
  const [extrasElegidos, setExtrasElegidos] = useState<string[]>([])
  const [cantidad, setCantidad] = useState(1)
  const [notasLinea, setNotasLinea] = useState('')

  const tamano = articulo.tamanos.find((t) => t.id === tamanoId)
  const extrasDelTamano = extrasParaTamano(articulo, tamanoId)

  // Al cambiar de tamaño, un extra elegido puede dejar de tener precio. Se
  // descarta en silencio en lugar de arrastrar una línea impagable.
  const extrasAplicados = extrasDelTamano
    .filter((extra) => extrasElegidos.includes(extra.id) && extra.disponible)
    .map((extra) => ({
      extraId: extra.id,
      nombre: extra.nombre,
      precioCentimos: extra.precioPorTamanoId[tamanoId],
    }))

  const total = tamano
    ? precioLinea({
        articuloId: articulo.id,
        tamanoId,
        precioUnitarioCentimos: tamano.precioCentimos,
        extras: extrasAplicados,
        cantidad,
      })
    : 0

  function alternarExtra(id: string) {
    setExtrasElegidos((actuales) =>
      actuales.includes(id) ? actuales.filter((e) => e !== id) : [...actuales, id],
    )
  }

  return (
    <HojaInferior titulo={articulo.nombre} onCerrar={onCerrar}>
      <h2 className="text-xl font-bold">{articulo.nombre}</h2>
      <p className="mt-1 text-sm text-neutral-400">{articulo.descripcion}</p>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide">Tamaño</legend>
        <div className="flex flex-col gap-2">
          {articulo.tamanos.map((t) => (
            <label
              key={t.id}
              className={`flex items-center justify-between rounded-lg border border-neutral-700 p-3
                ${t.disponible ? '' : 'opacity-50'}`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="tamano"
                  value={t.id}
                  checked={t.id === tamanoId}
                  disabled={!t.disponible}
                  onChange={() => setTamanoId(t.id)}
                />
                {t.nombre}
              </span>
              <span className="font-medium">{formatearPrecio(t.precioCentimos)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {extrasDelTamano.length > 0 && (
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-semibold uppercase tracking-wide">
            Complementos
          </legend>
          <div className="flex flex-col gap-2">
            {extrasDelTamano.map((extra) => (
              <label
                key={extra.id}
                className={`flex items-center justify-between rounded-lg border border-neutral-700 p-3
                  ${extra.disponible ? '' : 'opacity-50'}`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={extrasElegidos.includes(extra.id)}
                    disabled={!extra.disponible}
                    onChange={() => alternarExtra(extra.id)}
                  />
                  <span>
                    {extra.nombre}
                    {!extra.disponible && (
                      <span className="ml-2 text-xs uppercase tracking-wide text-amber-500">
                        Hoy no disponible
                      </span>
                    )}
                  </span>
                </span>
                <span className="font-medium">
                  {formatearPrecio(extra.precioPorTamanoId[tamanoId])}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="mt-5 block">
        <span className="text-sm font-semibold uppercase tracking-wide">Nota para la cocina</span>
        <input
          type="text"
          value={notasLinea}
          onChange={(e) => setNotasLinea(e.target.value)}
          placeholder="sin tomate, poco hecho..."
          className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
      </label>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          aria-label="Reducir cantidad"
          onClick={() => setCantidad((c) => Math.max(1, c - 1))}
          className="h-11 w-11 rounded-full border border-neutral-700 text-xl"
        >
          −
        </button>
        <span aria-live="polite" className="w-6 text-center text-lg font-semibold">
          {cantidad}
        </span>
        <button
          type="button"
          aria-label="Aumentar cantidad"
          onClick={() => setCantidad((c) => c + 1)}
          className="h-11 w-11 rounded-full border border-neutral-700 text-xl"
        >
          +
        </button>
      </div>

      <button
        type="button"
        disabled={!tamano}
        onClick={() =>
          tamano &&
          onAnadir({
            articuloId: articulo.id,
            nombreArticulo: articulo.nombre,
            imagenUrl: articulo.imagenUrl,
            tamanoId,
            nombreTamano: tamano.nombre,
            precioUnitarioCentimos: tamano.precioCentimos,
            extras: extrasAplicados,
            cantidad,
            notasLinea,
          })
        }
        className="mt-6 h-14 w-full rounded-xl bg-amber-500 text-lg font-bold text-neutral-950"
      >
        Añadir · {formatearPrecio(total)}
      </button>
    </HojaInferior>
  )
}
```

- [ ] **Step 6: Ejecutar los tests y comprobar que pasan**

Run: `pnpm test src/components/carta/FichaArticulo`
Expected: PASS, 6 tests.

- [ ] **Step 7: Enganchar la ficha a la vista de carta**

En `src/components/carta/VistaCarta.tsx`, sustituir el marcador por la ficha real:

```tsx
{abierto && (
  <FichaArticulo
    articulo={abierto}
    onCerrar={() => setAbierto(null)}
    onAnadir={() => setAbierto(null)}
  />
)}
```

El `onAnadir` se conecta al carrito en la Tarea 9.

- [ ] **Step 8: Comprobar en el navegador**

Run: `pnpm dev`
Expected: al tocar un artículo se abre la hoja desde abajo; cambiar tamaño y marcar extras actualiza el importe del botón.

- [ ] **Step 9: Commit**

```bash
git add src/lib/carrito/tipos.ts src/components/ui src/components/carta
git commit -m "Añade la ficha de artículo con tamaños, complementos y cantidad"
```

---

### Tarea 8: Estado del carrito

**Files:**
- Create: `src/lib/carrito/store.ts`
- Test: `src/lib/carrito/store.test.ts`

**Interfaces:**
- Consumes: `LineaParaCarrito` de la Tarea 7.
- Produces: `useCarrito` con estado `lineas: LineaEnCarrito[]` y acciones `anadir`, `cambiarCantidad`, `eliminar`, `vaciar`; y el tipo `LineaEnCarrito = LineaParaCarrito & { id: string }`.

- [ ] **Step 1: Instalar Zustand**

```bash
pnpm add zustand
```

- [ ] **Step 2: Escribir los tests que fallan**

Crear `src/lib/carrito/store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { useCarrito } from './store'
import type { LineaParaCarrito } from './tipos'

function nueva(parcial: Partial<LineaParaCarrito> = {}): LineaParaCarrito {
  return {
    articuloId: 'a-1',
    nombreArticulo: 'Lomo',
    imagenUrl: null,
    tamanoId: 't-b',
    nombreTamano: 'Bocadillo',
    precioUnitarioCentimos: 500,
    extras: [],
    cantidad: 1,
    notasLinea: '',
    ...parcial,
  }
}

beforeEach(() => {
  useCarrito.getState().vaciar()
})

describe('carrito', () => {
  it('empieza vacío', () => {
    expect(useCarrito.getState().lineas).toEqual([])
  })

  it('añade una línea con identificador propio', () => {
    useCarrito.getState().anadir(nueva())
    const { lineas } = useCarrito.getState()
    expect(lineas).toHaveLength(1)
    expect(lineas[0].id).toBeTruthy()
    expect(lineas[0].nombreArticulo).toBe('Lomo')
  })

  it('agrupa dos líneas idénticas sumando la cantidad', () => {
    useCarrito.getState().anadir(nueva())
    useCarrito.getState().anadir(nueva({ cantidad: 2 }))
    const { lineas } = useCarrito.getState()
    expect(lineas).toHaveLength(1)
    expect(lineas[0].cantidad).toBe(3)
  })

  it('no agrupa si cambia el tamaño', () => {
    useCarrito.getState().anadir(nueva())
    useCarrito.getState().anadir(nueva({ tamanoId: 't-m', nombreTamano: 'Montado' }))
    expect(useCarrito.getState().lineas).toHaveLength(2)
  })

  it('no agrupa si cambian los extras', () => {
    useCarrito.getState().anadir(nueva())
    useCarrito
      .getState()
      .anadir(nueva({ extras: [{ extraId: 'e-1', nombre: 'Queso', precioCentimos: 100 }] }))
    expect(useCarrito.getState().lineas).toHaveLength(2)
  })

  it('no agrupa si cambia la nota', () => {
    useCarrito.getState().anadir(nueva())
    useCarrito.getState().anadir(nueva({ notasLinea: 'sin tomate' }))
    expect(useCarrito.getState().lineas).toHaveLength(2)
  })

  it('agrupa aunque los extras vengan en distinto orden', () => {
    const queso = { extraId: 'e-1', nombre: 'Queso', precioCentimos: 100 }
    const tomate = { extraId: 'e-2', nombre: 'Rodaja de tomate', precioCentimos: 100 }
    useCarrito.getState().anadir(nueva({ extras: [queso, tomate] }))
    useCarrito.getState().anadir(nueva({ extras: [tomate, queso] }))
    expect(useCarrito.getState().lineas).toHaveLength(1)
  })

  it('cambia la cantidad de una línea', () => {
    useCarrito.getState().anadir(nueva())
    const { id } = useCarrito.getState().lineas[0]
    useCarrito.getState().cambiarCantidad(id, 4)
    expect(useCarrito.getState().lineas[0].cantidad).toBe(4)
  })

  it('elimina la línea al bajar la cantidad a cero', () => {
    useCarrito.getState().anadir(nueva())
    const { id } = useCarrito.getState().lineas[0]
    useCarrito.getState().cambiarCantidad(id, 0)
    expect(useCarrito.getState().lineas).toEqual([])
  })

  it('elimina una línea concreta', () => {
    useCarrito.getState().anadir(nueva())
    useCarrito.getState().anadir(nueva({ tamanoId: 't-m', nombreTamano: 'Montado' }))
    const { id } = useCarrito.getState().lineas[0]
    useCarrito.getState().eliminar(id)
    expect(useCarrito.getState().lineas).toHaveLength(1)
    expect(useCarrito.getState().lineas[0].nombreTamano).toBe('Montado')
  })
})
```

- [ ] **Step 3: Ejecutar los tests y comprobar que fallan**

Run: `pnpm test src/lib/carrito`
Expected: FAIL, no existe el módulo.

- [ ] **Step 4: Implementar**

Crear `src/lib/carrito/store.ts`:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LineaParaCarrito } from './tipos'

export type LineaEnCarrito = LineaParaCarrito & { id: string }

type EstadoCarrito = {
  lineas: LineaEnCarrito[]
  anadir: (linea: LineaParaCarrito) => void
  cambiarCantidad: (id: string, cantidad: number) => void
  eliminar: (id: string) => void
  vaciar: () => void
}

/**
 * Huella de una línea a efectos de agrupación: mismo artículo, mismo tamaño,
 * mismos extras y misma nota. Los extras se ordenan porque el orden en que el
 * cliente los marca no debe impedir agrupar dos líneas iguales.
 */
function huella(linea: LineaParaCarrito): string {
  const extras = linea.extras
    .map((extra) => extra.extraId)
    .sort()
    .join(',')
  return [linea.articuloId, linea.tamanoId, extras, linea.notasLinea.trim()].join('|')
}

export const useCarrito = create<EstadoCarrito>()(
  persist(
    (set) => ({
      lineas: [],

      anadir: (nueva) =>
        set((estado) => {
          const huellaNueva = huella(nueva)
          const existente = estado.lineas.find((linea) => huella(linea) === huellaNueva)

          if (existente) {
            return {
              lineas: estado.lineas.map((linea) =>
                linea.id === existente.id
                  ? { ...linea, cantidad: linea.cantidad + nueva.cantidad }
                  : linea,
              ),
            }
          }

          return { lineas: [...estado.lineas, { ...nueva, id: crypto.randomUUID() }] }
        }),

      cambiarCantidad: (id, cantidad) =>
        set((estado) => ({
          lineas:
            cantidad <= 0
              ? estado.lineas.filter((linea) => linea.id !== id)
              : estado.lineas.map((linea) => (linea.id === id ? { ...linea, cantidad } : linea)),
        })),

      eliminar: (id) =>
        set((estado) => ({ lineas: estado.lineas.filter((linea) => linea.id !== id) })),

      vaciar: () => set({ lineas: [] }),
    }),
    {
      name: 'carrito-horno-caseron',
      version: 1,
      // El servidor no tiene localStorage. Sin esto, el HTML del servidor y el
      // del cliente difieren y React lanza un error de hidratación.
      skipHydration: true,
    },
  ),
)
```

- [ ] **Step 5: Ejecutar los tests y comprobar que pasan**

Run: `pnpm test src/lib/carrito`
Expected: PASS, 11 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/carrito package.json pnpm-lock.yaml
git commit -m "Añade el carrito con agrupación de líneas y persistencia local"
```

---

### Tarea 9: Barra y hoja de carrito

**Files:**
- Create: `src/components/carrito/BarraCarrito.tsx`
- Create: `src/components/carrito/HojaCarrito.tsx`
- Modify: `src/components/carta/VistaCarta.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/components/carrito/HojaCarrito.test.tsx`

**Interfaces:**
- Consumes: `useCarrito`, `calcularResumen`, `obtenerReglas`, `formatearPrecio`.
- Produces: `<BarraCarrito reglas={...} onAbrir={...} />` y `<HojaCarrito reglas={...} onCerrar={...} />`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/components/carrito/HojaCarrito.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HojaCarrito } from './HojaCarrito'
import { useCarrito } from '@/lib/carrito/store'
import type { ReglasPedido } from '@/lib/precios/tipos'

const REGLAS: ReglasPedido = {
  envioCentimos: 200,
  pedidoMinimoCentimos: 1000,
  envioGratisDesdeCentimos: 2000,
}

function anadir(precioCentimos: number, cantidad = 1) {
  useCarrito.getState().anadir({
    articuloId: `a-${precioCentimos}`,
    nombreArticulo: 'Lomo',
    imagenUrl: null,
    tamanoId: 't-b',
    nombreTamano: 'Bocadillo',
    precioUnitarioCentimos: precioCentimos,
    extras: [],
    cantidad,
    notasLinea: '',
  })
}

beforeEach(() => {
  useCarrito.getState().vaciar()
})

describe('HojaCarrito', () => {
  it('avisa de cuánto falta para el pedido mínimo', () => {
    anadir(750)
    render(<HojaCarrito reglas={REGLAS} onCerrar={vi.fn()} />)
    expect(screen.getByText(/Te faltan 2,50/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continuar/ })).toBeDisabled()
  })

  it('avisa de cuánto falta para el envío gratuito una vez superado el mínimo', () => {
    anadir(1500)
    render(<HojaCarrito reglas={REGLAS} onCerrar={vi.fn()} />)
    expect(screen.getByText(/5,00.*envío gratis/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continuar/ })).toBeEnabled()
  })

  it('anuncia el envío gratuito al alcanzar el umbral', () => {
    anadir(2000)
    render(<HojaCarrito reglas={REGLAS} onCerrar={vi.fn()} />)
    expect(screen.getByText(/Envío gratis/)).toBeInTheDocument()
  })

  it('muestra el desglose de subtotal, envío y total', () => {
    anadir(1200)
    render(<HojaCarrito reglas={REGLAS} onCerrar={vi.fn()} />)
    expect(screen.getByTestId('subtotal')).toHaveTextContent('12,00')
    expect(screen.getByTestId('envio')).toHaveTextContent('2,00')
    expect(screen.getByTestId('total')).toHaveTextContent('14,00')
  })

  it('avisa cuando el carrito está vacío', () => {
    render(<HojaCarrito reglas={REGLAS} onCerrar={vi.fn()} />)
    expect(screen.getByText(/carrito está vacío/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm test src/components/carrito`
Expected: FAIL, no existe `HojaCarrito`.

- [ ] **Step 3: Implementar la hoja de carrito**

Crear `src/components/carrito/HojaCarrito.tsx`:

```tsx
'use client'

import { HojaInferior } from '@/components/ui/HojaInferior'
import { useCarrito } from '@/lib/carrito/store'
import { formatearPrecio } from '@/lib/dinero'
import { calcularResumen } from '@/lib/precios'
import type { ReglasPedido } from '@/lib/precios/tipos'

type Props = {
  reglas: ReglasPedido
  onCerrar: () => void
}

export function HojaCarrito({ reglas, onCerrar }: Props) {
  const lineas = useCarrito((estado) => estado.lineas)
  const cambiarCantidad = useCarrito((estado) => estado.cambiarCantidad)
  const resumen = calcularResumen(lineas, 'domicilio', reglas)

  return (
    <HojaInferior titulo="Tu pedido" onCerrar={onCerrar}>
      <h2 className="text-xl font-bold">Tu pedido</h2>

      {lineas.length === 0 ? (
        <p className="mt-6 text-neutral-400">Tu carrito está vacío.</p>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-4">
            {lineas.map((linea) => (
              <li key={linea.id} className="flex gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {linea.nombreArticulo}{' '}
                    <span className="text-neutral-400">· {linea.nombreTamano}</span>
                  </p>
                  {linea.extras.length > 0 && (
                    <p className="text-sm text-neutral-400">
                      {linea.extras.map((extra) => extra.nombre).join(', ')}
                    </p>
                  )}
                  {linea.notasLinea && (
                    <p className="text-sm italic text-amber-500">{linea.notasLinea}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={`Reducir ${linea.nombreArticulo}`}
                      onClick={() => cambiarCantidad(linea.id, linea.cantidad - 1)}
                      className="h-9 w-9 rounded-full border border-neutral-700"
                    >
                      −
                    </button>
                    <span>{linea.cantidad}</span>
                    <button
                      type="button"
                      aria-label={`Aumentar ${linea.nombreArticulo}`}
                      onClick={() => cambiarCantidad(linea.id, linea.cantidad + 1)}
                      className="h-9 w-9 rounded-full border border-neutral-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-6 flex flex-col gap-1 border-t border-neutral-800 pt-4 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd data-testid="subtotal">{formatearPrecio(resumen.subtotalCentimos)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Envío</dt>
              <dd data-testid="envio">
                {resumen.envioEsGratis ? 'Gratis' : formatearPrecio(resumen.envioCentimos)}
              </dd>
            </div>
            <div className="flex justify-between text-base font-bold">
              <dt>Total</dt>
              <dd data-testid="total">{formatearPrecio(resumen.totalCentimos)}</dd>
            </div>
          </dl>

          {!resumen.alcanzaMinimo && (
            <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
              Te faltan {formatearPrecio(resumen.faltaParaMinimoCentimos)} para llegar al pedido
              mínimo a domicilio.
            </p>
          )}

          {resumen.alcanzaMinimo && resumen.faltaParaEnvioGratisCentimos !== null && (
            <p className="mt-4 rounded-lg bg-neutral-800 p-3 text-sm text-neutral-300">
              Añade {formatearPrecio(resumen.faltaParaEnvioGratisCentimos)} más y el envío gratis
              es tuyo.
            </p>
          )}

          {resumen.envioEsGratis && (
            <p className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
              Envío gratis conseguido.
            </p>
          )}

          <button
            type="button"
            disabled={!resumen.alcanzaMinimo}
            className="mt-6 h-14 w-full rounded-xl bg-amber-500 text-lg font-bold text-neutral-950 disabled:opacity-40"
          >
            Continuar
          </button>
        </>
      )}
    </HojaInferior>
  )
}
```

El botón «Continuar» todavía no navega a ningún sitio: el checkout llega en el plan siguiente.

- [ ] **Step 4: Ejecutar los tests y comprobar que pasan**

Run: `pnpm test src/components/carrito`
Expected: PASS, 5 tests.

- [ ] **Step 5: Implementar la barra fija**

Crear `src/components/carrito/BarraCarrito.tsx`:

```tsx
'use client'

import { useCarrito } from '@/lib/carrito/store'
import { formatearPrecio } from '@/lib/dinero'
import { calcularResumen } from '@/lib/precios'
import type { ReglasPedido } from '@/lib/precios/tipos'

type Props = {
  reglas: ReglasPedido
  onAbrir: () => void
}

export function BarraCarrito({ reglas, onAbrir }: Props) {
  const lineas = useCarrito((estado) => estado.lineas)
  if (lineas.length === 0) return null

  const unidades = lineas.reduce((total, linea) => total + linea.cantidad, 0)
  const resumen = calcularResumen(lineas, 'domicilio', reglas)

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/95 p-4 backdrop-blur">
      <button
        type="button"
        onClick={onAbrir}
        className="mx-auto flex h-14 w-full max-w-lg items-center justify-between rounded-xl bg-amber-500 px-5 font-bold text-neutral-950"
      >
        <span>
          Ver pedido · {unidades} {unidades === 1 ? 'artículo' : 'artículos'}
        </span>
        <span>{formatearPrecio(resumen.subtotalCentimos)}</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Enganchar todo en la vista de carta**

Reescribir `src/components/carta/VistaCarta.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { BarraCarrito } from '@/components/carrito/BarraCarrito'
import { HojaCarrito } from '@/components/carrito/HojaCarrito'
import { useCarrito } from '@/lib/carrito/store'
import type { ArticuloCarta, Carta } from '@/lib/carta/tipos'
import type { ReglasPedido } from '@/lib/precios/tipos'
import { FichaArticulo } from './FichaArticulo'
import { PestanasCategorias } from './PestanasCategorias'

export function VistaCarta({ carta, reglas }: { carta: Carta; reglas: ReglasPedido }) {
  const [abierto, setAbierto] = useState<ArticuloCarta | null>(null)
  const [carritoVisible, setCarritoVisible] = useState(false)
  const anadir = useCarrito((estado) => estado.anadir)

  // El carrito persiste en localStorage y se rehidrata aquí, ya en el
  // navegador, porque el servidor no tiene localStorage.
  useEffect(() => {
    void useCarrito.persist.rehydrate()
  }, [])

  return (
    <>
      <PestanasCategorias categorias={carta.categorias} onAbrirArticulo={setAbierto} />

      {abierto && (
        <FichaArticulo
          articulo={abierto}
          onCerrar={() => setAbierto(null)}
          onAnadir={(linea) => {
            anadir(linea)
            setAbierto(null)
          }}
        />
      )}

      <BarraCarrito reglas={reglas} onAbrir={() => setCarritoVisible(true)} />
      {carritoVisible && (
        <HojaCarrito reglas={reglas} onCerrar={() => setCarritoVisible(false)} />
      )}
    </>
  )
}
```

Y en `src/app/page.tsx`, pasar también las reglas:

```tsx
const [carta, reglas] = await Promise.all([obtenerCarta(), obtenerReglas()])
...
<VistaCarta carta={carta} reglas={reglas} />
```

Recordar añadir `obtenerReglas` al import de `@/lib/carta/consultas`.

- [ ] **Step 7: Ejecutar toda la batería y comprobar el navegador**

Run: `pnpm test`
Expected: PASS, todos los tests.

Run: `pnpm dev`
Expected: añadir un artículo hace aparecer la barra; al abrirla se ve el desglose y el aviso correspondiente; recargar la página conserva el carrito.

- [ ] **Step 8: Commit**

```bash
git add src/components src/app
git commit -m "Añade la barra y la hoja de carrito con los avisos de mínimo y envío gratuito"
```

---

### Tarea 10: Recorrido de extremo a extremo

**Files:**
- Create: `playwright.config.ts`
- Test: `e2e/carta-y-carrito.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: la aplicación completa de las tareas anteriores.
- Produces: el comando `pnpm test:e2e`.

- [ ] **Step 1: Instalar Playwright**

```bash
pnpm add -D @playwright/test
pnpx playwright install chromium
```

- [ ] **Step 2: Configurar Playwright**

Crear `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3000' },
  projects: [{ name: 'movil', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

Añadir a los scripts de `package.json`:

```json
"test:e2e": "playwright test"
```

Y excluir `e2e/` de Vitest, que si no intentará ejecutar esos ficheros: en `vitest.config.ts` el `include` ya limita a `src/**`, así que no hace falta nada más. Comprobarlo.

- [ ] **Step 3: Escribir el recorrido**

Crear `e2e/carta-y-carrito.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('un cliente monta un pedido desde el móvil', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'El Horno del Caserón' })).toBeVisible()

  // Elegir un artículo de la primera categoría
  await page.getByRole('button', { name: 'Lomo' }).click()
  await expect(page.getByRole('dialog', { name: 'Lomo' })).toBeVisible()

  // Cambiar de tamaño y añadir un complemento
  await page.getByRole('radio', { name: /Montado/ }).check()
  await page.getByRole('checkbox', { name: /Queso/ }).check()
  await page.getByRole('button', { name: 'Aumentar cantidad' }).click()

  // 400 + 50 = 450, por dos unidades
  await page.getByRole('button', { name: /Añadir/ }).click()

  // La barra de carrito aparece con el subtotal
  const barra = page.getByRole('button', { name: /Ver pedido/ })
  await expect(barra).toBeVisible()
  await expect(barra).toContainText('2 artículos')
  await expect(barra).toContainText('9,00')

  // El carrito avisa de que no llega al pedido mínimo
  await barra.click()
  await expect(page.getByText(/Te faltan 1,00/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled()
})

test('el carrito sobrevive a una recarga', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Lomo' }).click()
  await page.getByRole('button', { name: /Añadir/ }).click()
  await expect(page.getByRole('button', { name: /Ver pedido/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: /Ver pedido/ })).toBeVisible()
})
```

- [ ] **Step 4: Ejecutar el recorrido**

Run: `pnpm test:e2e`
Expected: PASS, 2 tests.

Si el primer test falla en el importe, comprobar que el precio del montado de Lomo en la base de datos es 400 y el del complemento Queso en montado es 50.

- [ ] **Step 5: Ejecutar todo y compilar**

Run: `pnpm test && pnpm build`
Expected: todo verde.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e package.json pnpm-lock.yaml .gitignore
git commit -m "Añade el recorrido de extremo a extremo de carta y carrito"
```

---

## Qué queda fuera de este plan

Los planes siguientes, en orden:

2. **Checkout, Stripe y seguimiento** — módulo `horario` con las franjas, formulario de checkout, sesión de Stripe, webhook idempotente, aviso por CallMeBot y página de seguimiento.
3. **Panel de cocina** — autenticación del personal, tablero de estados, confirmación de franja, Realtime y aviso sonoro.
4. **Administración** — CRUD de carta, pantalla de disponibilidad, ajustes, equipo e historial.
5. **Reparto y despliegue** — perfil de repartidor y publicación en Vercel.
