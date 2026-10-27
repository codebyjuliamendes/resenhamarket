package br.ufma.resenhamarket.movimentacao;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;

class MotivoMovimentacaoTest {
  @Test void motivosRespeitamOTipoDaMovimentacao(){
    assertThat(MotivoMovimentacao.COMPRA.aceita(TipoMovimentacao.ENTRADA)).isTrue();
    assertThat(MotivoMovimentacao.COMPRA.aceita(TipoMovimentacao.SAIDA)).isFalse();
    assertThat(MotivoMovimentacao.VENDA.aceita(TipoMovimentacao.ENTRADA)).isFalse();
    assertThat(MotivoMovimentacao.AJUSTE.aceita(TipoMovimentacao.ENTRADA)).isTrue();
    assertThat(MotivoMovimentacao.AJUSTE.aceita(TipoMovimentacao.SAIDA)).isTrue();
  }
}
