/*
 * Reescribe a index.html las rutas que no son ficheros.
 *
 * Sin esto, recargar /cafe/abc o /mis-ordenes en el navegador daria 404: en el
 * almacen de objetos no existe un objeto con ese nombre, porque las rutas las decide
 * el router del cliente, que ya se habria ejecutado si la pagina hubiera cargado.
 *
 * **No se reescriben las peticiones con extension.** Un `bundle.a1b2c3.js` que no
 * exista tiene que seguir dando 404, porque si se le devolviera el index.html el
 * navegador recibiria HTML donde esperaba JavaScript y el fallo aparece como "la pagina
 * esta rota" en lugar de "falta un fichero".
 *
 * **Por que una funcion y no la regla de errores de la distribucion.** La regla que
 * convierte 403 y 404 en index.html tambien se aplicaria a las respuestas de la API, si
 * la API estuviera detras de la misma distribucion, y devolveria HTML donde el
 * cliente espera JSON. La API esta en su propio origen, y aun asi esta funcion es la
 * opcion mas precisa: decide por la forma de la ruta y no por el codigo de error.
 */
function handler(event) {
  var request = event.request
  var uri = request.uri

  // "/" ya lo resuelve el objeto raiz de la distribucion.
  if (uri === '/') {
    return request
  }

  // Con extension, la peticion es por un fichero real.
  if (/\.[a-zA-Z0-9]+$/.test(uri)) {
    return request
  }

  request.uri = '/index.html'

  return request
}
