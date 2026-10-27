import { HttpError, type CampoInvalido } from './http';

/**
 * Small field validator that collects every problem and throws one 400 VALIDACAO,
 * the same contract as the Spring MethodArgumentNotValidException handler.
 */
export class Validator {
  private readonly campos: CampoInvalido[] = [];
  private readonly body: Record<string, unknown>;

  constructor(body: unknown) {
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      throw new HttpError(400, 'REQUISICAO_INVALIDA', 'Os dados enviados não estão no formato esperado.');
    }
    this.body = body as Record<string, unknown>;
  }

  fail(campo: string, mensagem: string): void {
    this.campos.push({ campo, mensagem });
  }

  /** Required (or optional) string, trimmed, with length limits. */
  string(campo: string, opts: { min?: number; max: number; optional?: boolean; trim?: boolean }): string | null {
    const raw = this.body[campo];
    if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
      if (!opts.optional) this.fail(campo, 'Campo obrigatório.');
      return null;
    }
    if (typeof raw !== 'string') {
      this.fail(campo, 'Informe um texto.');
      return null;
    }
    const value = opts.trim === false ? raw : raw.trim();
    if (opts.min !== undefined && value.length < opts.min) this.fail(campo, `Use pelo menos ${opts.min} caracteres.`);
    if (value.length > opts.max) this.fail(campo, `Use no máximo ${opts.max} caracteres.`);
    return value;
  }

  /** Number or numeric string (the Spring API accepts both for BigDecimal fields). */
  number(campo: string, opts: { min?: number; optional?: boolean } = {}): number | null {
    const raw = this.body[campo];
    if (raw === undefined || raw === null || raw === '') {
      if (!opts.optional) this.fail(campo, 'Campo obrigatório.');
      return null;
    }
    const value = typeof raw === 'number' ? raw : typeof raw === 'string' && /^-?\d+(\.\d+)?$/.test(raw.trim()) ? Number(raw) : Number.NaN;
    if (!Number.isFinite(value)) {
      this.fail(campo, 'Informe um número.');
      return null;
    }
    if (opts.min !== undefined && value < opts.min) this.fail(campo, `Informe um valor maior ou igual a ${opts.min}.`);
    if (Math.abs(value) >= 1e11) this.fail(campo, 'Valor grande demais.');
    return value;
  }

  oneOf<T extends string>(campo: string, guard: (v: unknown) => v is T): T | null {
    const raw = this.body[campo];
    if (raw === undefined || raw === null || raw === '') {
      this.fail(campo, 'Campo obrigatório.');
      return null;
    }
    if (!guard(raw)) {
      this.fail(campo, 'Valor inválido.');
      return null;
    }
    return raw;
  }

  done(): void {
    if (this.campos.length) throw new HttpError(400, 'VALIDACAO', 'Confira os campos destacados.', this.campos);
  }
}
