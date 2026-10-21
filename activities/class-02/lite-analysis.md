# Análisis del proyecto Lite

> **Completado ANTES de usar cualquier herramienta de IA y ANTES de corregir el código.**
> Este documento es la evidencia del análisis independiente y quedó guardado con el tag
> `class-02-lite-analysis`.
>
> Método aplicado: **ejecutar → observar → registrar**. Todas las respuestas se capturaron con
> `curl -i` para ver la línea de estado, no solo el cuerpo.

## 1. Cómo ejecuté la API

```bash
cd activities/class-02/lite-api
npm install
node server.js
# Request API Lite is running on http://localhost:3000
```

En otra terminal ejecuté los casos A1–A6 del documento de casos de prueba, en el orden
indicado, y registré cada respuesta tal como llegó.

## 2. Tabla de análisis

| Endpoint | Intención | Entrada | Respuesta actual | Problema | Propuesta |
| -------- | --------- | ------- | ---------------- | -------- | --------- |
| `GET /getRequests` | Listar todas las solicitudes | Sin entrada | `200` + arreglo JSON con las 3 solicitudes | La ruta usa un **verbo** (`get`) para nombrar un recurso. No es coherente con REST: el método ya expresa la operación. | `GET /requests` → `200` + arreglo JSON |
| `GET /requests` (ruta del recurso) | Listar todas las solicitudes | Sin entrada | `404` + HTML `Cannot GET /requests` | El recurso **no existe** bajo su nombre correcto: la ruta de listado está mal nombrada. | `GET /requests` → `200` + arreglo JSON |
| `GET /requests/1` | Consultar la solicitud con id 1 | Path param `id = 1` | `200` + objeto JSON de la solicitud 1 | Correcto: recurso existente → `200`. | Se mantiene: `200` + objeto |
| `GET /requests/999` | Consultar una solicitud inexistente | Path param `id = 999` | `200` + `{"error":"Request not found"}` | **El estado contradice el cuerpo.** Afirma éxito (`200`) pero el cuerpo describe un fallo. Un cliente que decide por el estado no puede distinguir "existe" de "no existe". | `404` + `{"error":"Request not found"}` |
| `POST /requests` (body válido) | Crear una solicitud nueva | Body JSON con `title`, `description`, `priority` | `200` + objeto creado con `id: 4` y `status: "open"` | **`200` en lugar de `201`.** Se creó un recurso nuevo pero el estado no lo comunica; el cliente no puede distinguir una creación de una consulta. | `201` + objeto creado |
| `POST /requests` (sin `title`) | Crear una solicitud nueva | Body JSON sin el campo `title` | `200` + objeto creado con `id: 5` y **`title` ausente** | **No valida el título.** Acepta y guarda una solicitud incompleta, violando la regla de negocio (el título es obligatorio). | `400` + `{"error":"Title is required"}` y **sin** cambios en los datos |
| `GET /getRequests` (tras crear) | Verificar el efecto de crear | Sin entrada | `200` + el arreglo ahora tiene **5** elementos, incluida la solicitud sin título (`id: 5`) | Confirma la consecuencia del defecto anterior: el dato inválido quedó persistido. | La lista solo debe contener las creaciones válidas |

## 3. Evidencia

Todas las peticiones se hicieron con el servidor de partida corriendo sin modificar.

### A1 · Listar por la ruta que expone el código

```txt
$ curl -i http://localhost:3000/getRequests
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

[{"id":1,"title":"Projector does not turn on",...,"priority":"high"},
 {"id":2,"title":"Broken chair in the lab",...,"priority":"medium"},
 {"id":3,"title":"Wi-Fi drops in the library",...,"priority":"low"}]
```

### A1b · Listar por la ruta del recurso

```txt
$ curl -i http://localhost:3000/requests
HTTP/1.1 404 Not Found
Content-Type: text/html; charset=utf-8

<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Error</title></head>
<body><pre>Cannot GET /requests</pre></body>
</html>
```

### A2 · Consultar una solicitud existente

```txt
$ curl -i http://localhost:3000/requests/1
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"id":1,"title":"Projector does not turn on",...,"priority":"high"}
```

### A3 · Consultar una solicitud inexistente

```txt
$ curl -i http://localhost:3000/requests/999
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"error":"Request not found"}
```

### A4 · Crear una solicitud válida

```txt
$ curl -i -X POST http://localhost:3000/requests \
    -H "Content-Type: application/json" \
    -d '{"title":"Leaking faucet","description":"The faucet in the third floor bathroom leaks.","priority":"medium"}'
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"id":4,"title":"Leaking faucet","description":"The faucet in the third floor bathroom leaks.","status":"open","priority":"medium"}
```

### A5 · Crear una solicitud sin título

```txt
$ curl -i -X POST http://localhost:3000/requests \
    -H "Content-Type: application/json" \
    -d '{"description":"No title at all","priority":"low"}'
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"id":5,"description":"No title at all","status":"open","priority":"low"}
```

### A6 · Efecto de A4 y A5 sobre los datos

```txt
$ curl -i http://localhost:3000/getRequests
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

[ ...tres solicitudes originales...,
  {"id":4,"title":"Leaking faucet",...,"priority":"medium"},
  {"id":5,"description":"No title at all","status":"open","priority":"low"} ]
```

El arreglo pasó de 3 a 5 elementos. La solicitud `id: 5` se guardó **sin título**: el dato
inválido quedó persistido y visible para cualquier cliente.

## 4. Preguntas guía

1. **¿Qué recurso representa esta API y cómo se nombra en cada una de sus rutas?**
   El recurso es una *solicitud de mantenimiento* (`request`). La ruta de listado se nombra
   `GET /getRequests` (con verbo) y las demás como `GET /requests/:id` y `POST /requests`
   (con sustantivo). El recurso cambia de nombre según la ruta: inconsistente.

2. **¿Qué método HTTP corresponde a cada intención, y coincide con el que usa el código?**
   Listar y consultar → `GET`; crear → `POST`. Los métodos usados son correctos, pero el
   *nombre* de la ruta de listado no lo es: `getRequests` incluye un verbo que el método ya
   comunica.

3. **¿Qué código de estado devuelve cada respuesta y qué afirma exactamente ese código?**
   Casi todo devuelve `200 OK`, que afirma: *la petición se procesó y el resultado es un
   éxito*. La ruta inexistente devuelve `404`, que afirma: *el recurso solicitado no existe*.
   La creación devuelve `200`, que no distingue "creado" de "devuelto".

4. **¿Hay alguna respuesta cuyo estado contradiga su propio cuerpo? ¿Cuál y por qué?**
   Sí, `GET /requests/999`: devuelve `200 OK` (éxito) con el cuerpo
   `{"error":"Request not found"}` (fallo). El estado y el cuerpo se contradicen.

5. **¿Qué entradas acepta el servidor sin comprobarlas, y qué consecuencia tiene aceptarlas?**
   El `title` en `POST /requests`. No lo valida: acepta un body sin título y guarda una
   solicitud incompleta (`id: 5`), que queda visible en el listado. Todo cliente que consuma
   la colección recibe un dato que viola la regla de negocio.

6. **¿Cómo distinguiría un cliente automático un éxito de un error sin leer el cuerpo?**
   No podría. Un cliente automático decide por el código de estado. Como el error de "no
   encontrado" llega con `200`, ese cliente trataría una consulta fallida como exitosa.

7. **¿Qué parte del comportamiento observado no podía deducirse leyendo solo las rutas?**
   Que `POST` acepta un body sin título y aun así responde éxito. Leyendo las rutas no se ve
   la falta de validación; solo aparece al ejecutar con un cuerpo incompleto. También el efecto
   acumulativo sobre los datos (la lista crece con datos inválidos).

8. **Si otra persona consumiera esta API sin ver el código, ¿qué supuesto la haría fallar?**
   Supondría que la ruta del recurso es `/requests` (por REST) y fallaría con `404`. Y
   supondría que un `200` significa éxito, por lo que trataría `{"error":"Request not found"}`
   como una respuesta válida.

## 5. Conclusión

El problema más grave es que **el estado HTTP contradice el resultado real**: la consulta de una
solicitud inexistente responde `200 OK` con un cuerpo de error. Es el más grave porque rompe la
base del contrato HTTP: un cliente automático (otro servicio, una app, un script) decide éxito o
fallo leyendo el código de estado, no el texto del cuerpo. Los otros defectos (ruta con verbo y
`201` faltante) son incoherencias de diseño, pero este provoca que un consumidor **actúe mal sin
enterarse**: creerá que obtuvo una solicitud cuando en realidad no existe. La validación ausente
del título también es seria, porque corrompe los datos, pero es detectable al leer el cuerpo;
la contradicción estado/cuerpo, en cambio, es silenciosa para un cliente automático.
