const MENSAJE_GENERICO = 'No se ha podido completar la acción. Inténtalo de nuevo.'

/**
 * En una pantalla de panel, una acción que no hace nada se lee como "¿lo
 * vuelvo a pulsar?": cuando la respuesta no es `ok` hay que enseñar algo. Los
 * endpoints del panel responden `{ error: string }`; si el cuerpo no llega o
 * no lo trae, se recurre al mensaje genérico.
 */
export async function mensajeDeError(respuesta: Response): Promise<string> {
  try {
    const cuerpo = (await respuesta.json()) as { error?: unknown }
    if (typeof cuerpo.error === 'string' && cuerpo.error.trim() !== '') return cuerpo.error
  } catch {
    // Cuerpo vacío o que no es JSON: se usa el mensaje genérico.
  }
  return MENSAJE_GENERICO
}
