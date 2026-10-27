// Script de diagnóstico de conexión · npm run db:check
//
// Prueba que el proyecto puede hablar con PostgreSQL. Imprime el nombre de la base y la
// versión del motor — NUNCA la URL de conexión ni la contraseña (la evidencia de la entrega
// tampoco debe hacerlo).
//
// Aquí SÍ se llama pool.end(): es un script que debe terminar y soltar el proceso. En el
// servidor Express, en cambio, el pool vive lo que vive el proceso y no se cierra por petición.
import { pool } from '../src/database/pool.js';

async function main() {
  try {
    const { rows } = await pool.query(
      'SELECT current_database() AS database, version() AS version'
    );
    const { database, version } = rows[0];
    console.log('✓ Conexión establecida');
    console.log(`  Base de datos: ${database}`);
    console.log(`  Motor:         ${version.split(',')[0]}`);
  } catch (error) {
    console.error('✗ No se pudo conectar con la base de datos.');
    // Solo el mensaje del error: jamás la cadena de conexión.
    console.error(`  ${error.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
