package br.ufma.resenhamarket.movimentacao;

import br.ufma.resenhamarket.produto.Produto;
import br.ufma.resenhamarket.usuario.Usuario;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name="movimentacao")
public class Movimentacao {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="produto_id") private Produto produto;
  @Enumerated(EnumType.STRING) @Column(nullable=false,length=10) private TipoMovimentacao tipo;
  @Column(nullable=false,precision=14,scale=3) private BigDecimal quantidade;
  @Column(name="saldo_apos",nullable=false,precision=14,scale=3) private BigDecimal saldoApos;
  @Enumerated(EnumType.STRING) @Column(nullable=false,length=30) private MotivoMovimentacao motivo;
  @Column(length=255) private String observacao;
  @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="usuario_id") private Usuario usuario;
  @Column(name="criado_em",nullable=false,updatable=false) private Instant criadoEm=Instant.now();
  protected Movimentacao(){}
  public static Movimentacao criar(Produto p,TipoMovimentacao tipo,BigDecimal qtd,BigDecimal saldo,MotivoMovimentacao motivo,String obs,Usuario u){var m=new Movimentacao();m.produto=p;m.tipo=tipo;m.quantidade=qtd;m.saldoApos=saldo;m.motivo=motivo;m.observacao=obs;m.usuario=u;return m;}
  public Long getId(){return id;}public Produto getProduto(){return produto;}public TipoMovimentacao getTipo(){return tipo;}public BigDecimal getQuantidade(){return quantidade;}public BigDecimal getSaldoApos(){return saldoApos;}public MotivoMovimentacao getMotivo(){return motivo;}public String getObservacao(){return observacao;}public Usuario getUsuario(){return usuario;}public Instant getCriadoEm(){return criadoEm;}
}
