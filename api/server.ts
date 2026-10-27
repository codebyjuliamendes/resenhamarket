import { createHandler } from './_lib/router';

// Response types shared with frontend/src/api/client.ts.
export type { Perfil, TipoMovimento } from './_lib/domain';
export type { Movimento, Produto, Usuario, UsuarioAdmin } from './_lib/store';

/**
 * Vercel serverless function behind the /api/v1/* rewrite (see vercel.json).
 *
 * It is a self-contained demonstration of the ResenhaMarket API: same routes, rules and error
 * codes as the Spring backend, with data kept in memory. Each function instance starts from the
 * demo data set and changes are lost when the instance is recycled.
 */
export default createHandler();
