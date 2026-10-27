package br.ufma.resenhamarket.produto;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name="produto")
public class Produto {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @Column(nullable=false,length=40) private String codigo;
  @Column(nullable=false,length=150) private String nome;
  @Column(length=500) private String descricao;
  @Column(name="unidade_medida",nullable=false,length=10) private String unidadeMedida;
  @Column(name="estoque_minimo",nullable=false,precision=14,scale=3) private BigDecimal estoqueMinimo=BigDecimal.ZERO;
  @Column(name="saldo_atual",nullable=false,precision=14,scale=3) private BigDecimal saldoAtual=BigDecimal.ZERO;
  @Column(nullable=false) private boolean ativo=true;
  @Column(name="criado_em",nullable=false,updatable=false) private Instant criadoEm=Instant.now();
  @Column(name="atualizado_em",nullable=false) private Instant atualizadoEm=Instant.now();
  @Version @Column(nullable=false) private long versao;
  protected Produto(){}
  public static Produto novo(String codigo,String nome,String descricao,String unidade,BigDecimal minimo){var p=new Produto();p.codigo=codigo.trim();p.nome=nome.trim();p.descricao=descricao;p.unidadeMedida=unidade.trim().toUpperCase();p.estoqueMinimo=minimo==null?BigDecimal.ZERO:minimo;return p;}
  public void atualizar(String codigo,String nome,String descricao,String unidade,BigDecimal minimo){this.codigo=codigo.trim();this.nome=nome.trim();this.descricao=descricao;this.unidadeMedida=unidade.trim().toUpperCase();this.estoqueMinimo=minimo==null?BigDecimal.ZERO:minimo;this.atualizadoEm=Instant.now();}
  public void inativar(){ativo=false;atualizadoEm=Instant.now();} public void reativar(){ativo=true;atualizadoEm=Instant.now();}
  public void aplicarSaldo(BigDecimal saldo){this.saldoAtual=saldo;this.atualizadoEm=Instant.now();}
  public Long getId(){return id;}public String getCodigo(){return codigo;}public String getNome(){return nome;}public String getDescricao(){return descricao;}public String getUnidadeMedida(){return unidadeMedida;}public BigDecimal getEstoqueMinimo(){return estoqueMinimo;}public BigDecimal getSaldoAtual(){return saldoAtual;}public boolean isAtivo(){return ativo;}public Instant getAtualizadoEm(){return atualizadoEm;}
}
