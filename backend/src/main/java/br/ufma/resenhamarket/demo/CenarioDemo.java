package br.ufma.resenhamarket.demo;

import br.ufma.resenhamarket.movimentacao.MotivoMovimentacao;
import br.ufma.resenhamarket.movimentacao.TipoMovimentacao;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Dados de demonstração para as sessões de validação (OS4). O modelo é o mesmo nos três ramos;
 * só mudam os produtos. Cada cenário tem ao menos um produto abaixo do mínimo e um sem estoque.
 */
public enum CenarioDemo {
  VAREJO("Varejo",List.of(
    p("V-001","Camiseta básica","Algodão, tamanho M","UN","6",compra("18"),venda("8")),
    p("V-002","Caderno 10 matérias",null,"UN","8",compra("32"),venda("6")),
    p("V-003","Pilha AA cartela","Cartela com 4 unidades","CX","5",compra("14"),venda("10")),
    p("V-004","Caneta esferográfica azul","Caixa com 50","CX","4",compra("20"),venda("5")),
    p("V-005","Fita adesiva transparente",null,"UN","10",compra("24"),venda("24")),
    p("V-006","Mochila escolar",null,"UN","3",compra("8"),entrada("1",MotivoMovimentacao.DEVOLUCAO_CLIENTE,"Troca de tamanho"),venda("2")),
    p("V-007","Garrafa térmica 500 ml",null,"UN","4",compra("9"),saida("1",MotivoMovimentacao.PERDA,"Avaria no transporte")),
    p("V-008","Papel A4 resma","500 folhas","PCT","6",compra("15"),saida("1",MotivoMovimentacao.CONSUMO_INTERNO,"Uso no caixa")))),
  FARMACIA("Farmácia",List.of(
    p("F-001","Dipirona 500 mg caixa com 10",null,"CX","8",compra("24"),venda("9")),
    p("F-002","Álcool 70% 1 litro",null,"UN","5",compra("16"),venda("12")),
    p("F-003","Soro fisiológico 500 ml",null,"UN","10",compra("30"),venda("6")),
    p("F-004","Paracetamol 750 mg caixa com 20",null,"CX","6",compra("18"),venda("7")),
    p("F-005","Protetor solar FPS 50","Frasco 120 ml","UN","4",compra("10"),venda("10")),
    p("F-006","Fralda infantil M",null,"PCT","5",compra("12"),venda("4")),
    p("F-007","Termômetro digital",null,"UN","2",compra("6"),saida("1",MotivoMovimentacao.DEVOLUCAO_FORNECEDOR,"Defeito de fábrica")),
    p("F-008","Gaze estéril",null,"PCT","10",compra("40"),saida("2",MotivoMovimentacao.CONSUMO_INTERNO,"Sala de curativos")))),
  ALIMENTICIO("Alimentício",List.of(
    p("A-001","Farinha de trigo",null,"KG","4",compra("12.5"),venda("3.75")),
    p("A-002","Leite integral",null,"L","8",compra("20"),venda("14")),
    p("A-003","Ovos bandeja 30",null,"PCT","3",compra("9"),venda("9")),
    p("A-004","Queijo muçarela","Vendido fatiado","KG","2",compra("5.2"),venda("1.35")),
    p("A-005","Café torrado 500 g",null,"PCT","6",compra("24"),venda("8")),
    p("A-006","Açúcar cristal",null,"KG","10",compra("30"),saida("2.5",MotivoMovimentacao.CONSUMO_INTERNO,"Uso na cozinha")),
    p("A-007","Óleo de soja 900 ml",null,"UN","6",compra("18"),saida("1",MotivoMovimentacao.PERDA,"Embalagem furada"),venda("5")),
    p("A-008","Banana prata",null,"KG","3",compra("8.4"),saida("1.2",MotivoMovimentacao.PERDA,"Madura demais"),venda("4"))));

  public record Movimento(TipoMovimentacao tipo,BigDecimal quantidade,MotivoMovimentacao motivo,String observacao){}
  public record ProdutoDemo(String codigo,String nome,String descricao,String unidade,BigDecimal minimo,List<Movimento> movimentos){
    public BigDecimal saldoFinal(){return movimentos.stream().map(m->m.tipo()==TipoMovimentacao.ENTRADA?m.quantidade():m.quantidade().negate()).reduce(BigDecimal.ZERO,BigDecimal::add);}
  }

  private final String rotulo;private final List<ProdutoDemo> produtos;
  CenarioDemo(String rotulo,List<ProdutoDemo> produtos){this.rotulo=rotulo;this.produtos=produtos;}
  public String rotulo(){return rotulo;} public List<ProdutoDemo> produtos(){return produtos;}

  /** Aceita varejo, farmacia, alimenticio ou todos (padrão), sem diferenciar maiúsculas e acentos simples. */
  public static List<CenarioDemo> resolver(String valor){
    String v=valor==null?"":valor.trim().toLowerCase(Locale.ROOT).replace('á','a').replace('í','i');
    if(v.isEmpty()||v.equals("todos"))return List.of(values());
    return Arrays.stream(values()).filter(c->c.name().toLowerCase(Locale.ROOT).equals(v)).findFirst().map(List::of)
      .orElseThrow(()->new IllegalArgumentException("APP_SEED_CENARIO inválido: '"+valor+"'. Use varejo, farmacia, alimenticio ou todos."));
  }

  private static ProdutoDemo p(String codigo,String nome,String descricao,String unidade,String minimo,Movimento...movimentos){return new ProdutoDemo(codigo,nome,descricao,unidade,new BigDecimal(minimo),List.of(movimentos));}
  private static Movimento compra(String q){return entrada(q,MotivoMovimentacao.COMPRA,"Estoque inicial da demonstração");}
  private static Movimento venda(String q){return saida(q,MotivoMovimentacao.VENDA,null);}
  private static Movimento entrada(String q,MotivoMovimentacao m,String obs){return new Movimento(TipoMovimentacao.ENTRADA,new BigDecimal(q),m,obs);}
  private static Movimento saida(String q,MotivoMovimentacao m,String obs){return new Movimento(TipoMovimentacao.SAIDA,new BigDecimal(q),m,obs);}
}
