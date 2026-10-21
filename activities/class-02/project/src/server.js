// Entry point: this file only starts the process. It does not know about routes.
import app from './app.js';

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Request API Full is running on http://localhost:${PORT}`);
});
