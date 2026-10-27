package br.ufma.resenhamarket.movimentacao;
import java.util.Set;
public enum MotivoMovimentacao {
  COMPRA(TipoMovimentacao.ENTRADA), DEVOLUCAO_CLIENTE(TipoMovimentacao.ENTRADA),
  AJUSTE(TipoMovimentacao.ENTRADA,TipoMovimentacao.SAIDA), OUTRO(TipoMovimentacao.ENTRADA,TipoMovimentacao.SAIDA),
  VENDA(TipoMovimentacao.SAIDA), PERDA(TipoMovimentacao.SAIDA), CONSUMO_INTERNO(TipoMovimentacao.SAIDA), DEVOLUCAO_FORNECEDOR(TipoMovimentacao.SAIDA);
  private final Set<TipoMovimentacao> tipos;MotivoMovimentacao(TipoMovimentacao...tipos){this.tipos=Set.of(tipos);}public boolean aceita(TipoMovimentacao tipo){return tipos.contains(tipo);}
}
