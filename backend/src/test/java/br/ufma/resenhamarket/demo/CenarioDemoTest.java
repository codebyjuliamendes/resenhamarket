package br.ufma.resenhamarket.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import br.ufma.resenhamarket.movimentacao.TipoMovimentacao;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Set;
import org.junit.jupiter.api.Test;

class CenarioDemoTest {
  private static final Set<String> INTEIRAS=Set.of("UN","CX","PCT");

  @Test void cadaCenarioTemProdutosAbaixoDoMinimoESemEstoque(){
    for(var c:CenarioDemo.values()){
      assertThat(c.produtos()).as(c.rotulo()).hasSize(8);
      assertThat(c.produtos()).as(c.rotulo()+" sem estoque").anyMatch(p->p.saldoFinal().signum()==0);
      assertThat(c.produtos()).as(c.rotulo()+" abaixo do mínimo").anyMatch(p->p.saldoFinal().signum()>0&&p.saldoFinal().compareTo(p.minimo())<=0);
      assertThat(c.produtos()).as(c.rotulo()+" disponível").anyMatch(p->p.saldoFinal().compareTo(p.minimo())>0);
    }
  }

  @Test void movimentosRespeitamAsRegrasDaApi(){
    for(var c:CenarioDemo.values())for(var p:c.produtos()){
      BigDecimal saldo=BigDecimal.ZERO;
      for(var m:p.movimentos()){
        assertThat(m.motivo().aceita(m.tipo())).as(p.codigo()+" motivo").isTrue();
        assertThat(m.quantidade().scale()).as(p.codigo()+" casas").isLessThanOrEqualTo(3);
        if(INTEIRAS.contains(p.unidade()))assertThat(m.quantidade().stripTrailingZeros().scale()).as(p.codigo()+" inteiro").isLessThanOrEqualTo(0);
        saldo=m.tipo()==TipoMovimentacao.ENTRADA?saldo.add(m.quantidade()):saldo.subtract(m.quantidade());
        assertThat(saldo.signum()).as(p.codigo()+" saldo nunca negativo").isGreaterThanOrEqualTo(0);
      }
    }
  }

  @Test void codigosSaoUnicosEntreCenarios(){
    var codigos=Arrays.stream(CenarioDemo.values()).flatMap(c->c.produtos().stream()).map(p->p.codigo().toLowerCase()).toList();
    assertThat(codigos).doesNotHaveDuplicates();
  }

  @Test void resolveNomesDoCenario(){
    assertThat(CenarioDemo.resolver(null)).containsExactly(CenarioDemo.values());
    assertThat(CenarioDemo.resolver(" Todos ")).hasSize(3);
    assertThat(CenarioDemo.resolver("FARMÁCIA")).containsExactly(CenarioDemo.FARMACIA);
    assertThat(CenarioDemo.resolver("alimentício")).containsExactly(CenarioDemo.ALIMENTICIO);
    assertThatThrownBy(()->CenarioDemo.resolver("padaria")).hasMessageContaining("varejo, farmacia, alimenticio ou todos");
  }
}
