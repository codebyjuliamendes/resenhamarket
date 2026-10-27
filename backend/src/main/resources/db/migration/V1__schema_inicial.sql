CREATE TABLE usuario (
  id BIGSERIAL PRIMARY KEY, nome VARCHAR(120) NOT NULL, email VARCHAR(160) NOT NULL UNIQUE,
  senha_hash VARCHAR(100) NOT NULL, perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('ADMINISTRADOR','OPERADOR')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE, criado_em TIMESTAMPTZ NOT NULL DEFAULT now(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE produto (
  id BIGSERIAL PRIMARY KEY, codigo VARCHAR(40) NOT NULL, nome VARCHAR(150) NOT NULL, descricao VARCHAR(500),
  unidade_medida VARCHAR(10) NOT NULL, estoque_minimo NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
  saldo_atual NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (saldo_atual >= 0), ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(), versao BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_produto_codigo_lower ON produto (lower(trim(codigo)));
CREATE INDEX idx_produto_nome_lower ON produto (lower(nome));
CREATE INDEX idx_produto_ativo ON produto (ativo);
CREATE TABLE movimentacao (
  id BIGSERIAL PRIMARY KEY, produto_id BIGINT NOT NULL REFERENCES produto(id), tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA')),
  quantidade NUMERIC(14,3) NOT NULL CHECK (quantidade > 0), saldo_apos NUMERIC(14,3) NOT NULL CHECK (saldo_apos >= 0),
  motivo VARCHAR(30) NOT NULL, observacao VARCHAR(255), usuario_id BIGINT NOT NULL REFERENCES usuario(id), criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mov_produto_data ON movimentacao (produto_id, criado_em DESC);
