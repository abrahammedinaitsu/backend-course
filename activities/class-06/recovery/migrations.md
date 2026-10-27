# Recuperación · Migraciones

## relation "requests" does not exist

Síntoma:
`relation "requests" does not exist` (código 42P01).

Significado:
La conexión funciona, pero la tabla no está disponible: el esquema no se
instaló (o apuntas a otra base).

Comprueba:
`npm run class-06:doctor` — ¿dice "schema has not been installed"?

Acción:
`npm run db:migrate`

Qué NO hacer:
No modifiques la ruta de Express para ocultar el error.

Pregunta:
¿Por qué este error demuestra que SÍ llegamos a PostgreSQL?

## Migración pendiente

Síntoma:
El doctor marca "All migrations applied ... FAIL".

Significado:
Hay archivos .sql que el libro de registro (schema_migrations) no conoce.

Acción:
`npm run db:migrate` — solo aplicará las pendientes, en orden.

Qué NO hacer:
No ejecutes los .sql a mano en el editor: el runner registra lo aplicado.

Pregunta:
¿Quién recuerda qué migraciones ya corrieron, tú o la base?

## Migración que falló a la mitad

Síntoma:
`[FAILED] 00X_...sql` con un error de SQL.

Significado:
Esa migración se revirtió completa (cada una corre en su transacción):
no hay cambios a medias.

Comprueba:
El mensaje: ¿qué línea del .sql rechazó PostgreSQL?

Acción:
Corrige la causa (¿orden? ¿tabla previa faltante?) y vuelve a ejecutar.

Qué NO hacer:
No marques la migración como aplicada a mano en schema_migrations.

Pregunta:
¿Qué habría quedado en la base si NO hubiera una transacción por migración?

## violates foreign key constraint

Síntoma:
`violates foreign key constraint` al insertar o borrar.

Significado:
La base defendió una relación: intentaste crear un hijo sin padre, o borrar
un padre con hijos vivos.

Comprueba:
¿En qué orden estás insertando o borrando? (history → requests → users
para borrar; al revés para crear).

Acción:
Respeta el orden de dependencias; en pruebas, borra primero el historial.

Qué NO hacer:
No elimines la constraint para "destrabar" el flujo.

Pregunta:
¿De qué error silencioso te acaba de salvar esta restricción?

## duplicate key value

Síntoma:
`duplicate key value violates unique constraint`.

Significado:
Ya existe una fila con ese valor único (típicamente un email repetido).

Comprueba:
¿Tus pruebas usan emails únicos por corrida (runId aleatorio)?

Acción:
Usa los helpers de test-data (generan emails únicos); si fue el seed,
recuerda que identifica a sus usuarios por email y no duplica.

Qué NO hacer:
No borres usuarios ajenos para liberar el email.

Pregunta:
¿Qué garantiza la unicidad: tu JavaScript o la base? ¿Por qué ambas capas?
