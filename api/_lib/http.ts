import type { IncomingMessage, ServerResponse } from 'node:http';

/** Same body shape as the Spring API's ApiError, so the web client handles both the same way. */
export interface ApiErrorBody {
  status: number;
  codigo: string;
  mensagem: string;
  campos: CampoInvalido[];
  timestamp: string;
}

export interface CampoInvalido {
  campo: string;
  mensagem: string;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    message: string,
    readonly campos: CampoInvalido[] = [],
  ) {
    super(message);
  }
}

export const MAX_BODY_BYTES = 64 * 1024;

/** Request as delivered by Vercel's Node runtime: `body` may already be parsed by the platform. */
export type ServerlessRequest = IncomingMessage & { body?: unknown };

function parseJson(text: string): unknown {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'REQUISICAO_INVALIDA', 'Os dados enviados não estão no formato esperado.');
  }
}

/**
 * Reads the JSON body. Vercel may hand the function an already parsed `req.body`; a plain Node
 * server (local development and tests) gives only the stream. Invalid JSON is a 400, not `{}`.
 */
export async function readJson(req: ServerlessRequest): Promise<unknown> {
  let preParsed: unknown;
  try {
    // On Vercel `req.body` is a lazy getter that throws on malformed JSON.
    preParsed = req.body;
  } catch {
    throw new HttpError(400, 'REQUISICAO_INVALIDA', 'Os dados enviados não estão no formato esperado.');
  }
  if (preParsed !== undefined && preParsed !== null) {
    if (typeof preParsed === 'string') return parseJson(preParsed);
    if (Buffer.isBuffer(preParsed)) return parseJson(preParsed.toString('utf8'));
    return preParsed;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'CORPO_MUITO_GRANDE', 'Os dados enviados são grandes demais.');
    chunks.push(buffer);
  }
  return parseJson(Buffer.concat(chunks).toString('utf8'));
}

export function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(data));
}

export function sendNoContent(res: ServerResponse): void {
  res.statusCode = 204;
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

export function errorBody(error: HttpError): ApiErrorBody {
  return { status: error.status, codigo: error.codigo, mensagem: error.message, campos: error.campos, timestamp: new Date().toISOString() };
}

/** Client IP as seen by Vercel (x-forwarded-for is set by the platform edge). */
export function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || 'desconhecido';
}

export function log(level: 'info' | 'warn' | 'error', msg: string, fields: Record<string, unknown> = {}): void {
  if (process.env.API_LOG === 'off') return;
  const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}
