/**
 * Runs the Vercel demo function as a plain Node server, for local development and end-to-end tests:
 *   PORT=3601 npm run dev:api
 *   (in frontend/) VITE_API_PROXY=http://localhost:3601 npm run dev
 */
import { createServer } from 'node:http';
import handler from '../api/server';

const port = Number(process.env.PORT ?? 3601);
const server = createServer((req, res) => {
  void handler(req, res);
});

server.listen(port, () => {
  console.log(JSON.stringify({ level: 'info', msg: `API de demonstração em http://localhost:${port}/api/v1` }));
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
