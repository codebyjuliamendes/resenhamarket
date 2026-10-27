package br.ufma.resenhamarket.movimentacao;

import br.ufma.resenhamarket.produto.Produto;
import br.ufma.resenhamarket.produto.ProdutoRepository;
import br.ufma.resenhamarket.shared.error.ApiException;
import br.ufma.resenhamarket.usuario.Usuario;
import br.ufma.resenhamarket.usuario.UsuarioRepository;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import br.ufma.resenhamarket.shared.PageDto;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @Transactional(readOnly=true)
public class MovimentacaoService {
  public record Entrada(@NotNull Long produtoId,@NotNull TipoMovimentacao tipo,@NotNull @DecimalMin(value="0.001") BigDecimal quantidade,@NotNull MotivoMovimentacao motivo,@Size(max=255)String observacao){}
  public record MovimentoDto(Long id,Long produtoId,String produtoNome,String produtoCodigo,TipoMovimentacao tipo,BigDecimal quantidade,BigDecimal saldoApos,MotivoMovimentacao motivo,String observacao,Long usuarioId,String usuarioNome,Instant criadoEm){}
  public record SaldoDto(Long produtoId,BigDecimal saldoAtual,BigDecimal saldoCalculado,boolean consistente){}
  private final ProdutoRepository produtos;private final MovimentacaoRepository movimentos;private final UsuarioRepository usuarios;
  public MovimentacaoService(ProdutoRepository produtos,MovimentacaoRepository movimentos,UsuarioRepository usuarios){this.produtos=produtos;this.movimentos=movimentos;this.usuarios=usuarios;}
  @Transactional public MovimentoDto registrar(Entrada in,Long usuarioId){
    Produto p=produtos.buscarParaMovimentacao(in.produtoId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"PRODUTO_NAO_ENCONTRADO","Produto não encontrado."));
    if(!p.isAtivo())throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"PRODUTO_INATIVO","Este produto está inativo e não aceita movimentações.");
    BigDecimal qtd=in.quantidade().stripTrailingZeros();
    // A escala é verificada depois de remover zeros à direita: "2.0000" é uma quantidade válida.
    if(qtd.scale()>3)throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"QUANTIDADE_INVALIDA","Use no máximo 3 casas decimais.");
    if(SetUnits.INTEIRAS.contains(p.getUnidadeMedida())&&qtd.scale()>0)throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"QUANTIDADE_FRACIONARIA","Para esta unidade, informe uma quantidade inteira.");
    if(!in.motivo().aceita(in.tipo()))throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"MOTIVO_INCOMPATIVEL","Este motivo não combina com o tipo de movimentação.");
    BigDecimal saldo=in.tipo()==TipoMovimentacao.ENTRADA?p.getSaldoAtual().add(in.quantidade()):p.getSaldoAtual().subtract(in.quantidade());
    if(saldo.signum()<0)throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"SALDO_INSUFICIENTE","Saldo insuficiente: disponível "+p.getSaldoAtual().stripTrailingZeros().toPlainString()+" "+p.getUnidadeMedida()+", solicitado "+in.quantidade().stripTrailingZeros().toPlainString()+" "+p.getUnidadeMedida()+".");
    Usuario u=usuarios.findById(usuarioId).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"NAO_AUTENTICADO","Faça login novamente."));
    p.aplicarSaldo(saldo);return dto(movimentos.save(Movimentacao.criar(p,in.tipo(),in.quantidade(),saldo,in.motivo(),blankToNull(in.observacao()),u)));
  }
  public PageDto<MovimentoDto> listar(Long produtoId,TipoMovimentacao tipo,Instant de,Instant ate,Integer page,Integer size){
    if(de!=null&&ate!=null&&!de.isBefore(ate))throw new ApiException(HttpStatus.BAD_REQUEST,"PERIODO_INVALIDO","A data inicial precisa ser anterior à data final.");
    int safePage=Math.max(0,page==null?0:page),safeSize=Math.min(100,Math.max(1,size==null?30:size));
    return PageDto.of(movimentos.filtrar(produtoId,tipo,de,ate,PageRequest.of(safePage,safeSize)),this::dto);
  }
  public SaldoDto conciliar(Long id){var p=produtos.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"PRODUTO_NAO_ENCONTRADO","Produto não encontrado."));var calculated=movimentos.saldoCalculado(id);return new SaldoDto(id,p.getSaldoAtual(),calculated,p.getSaldoAtual().compareTo(calculated)==0);}
  private MovimentoDto dto(Movimentacao m){return new MovimentoDto(m.getId(),m.getProduto().getId(),m.getProduto().getNome(),m.getProduto().getCodigo(),m.getTipo(),m.getQuantidade(),m.getSaldoApos(),m.getMotivo(),m.getObservacao(),m.getUsuario().getId(),m.getUsuario().getNome(),m.getCriadoEm());}
  private String blankToNull(String s){return s==null||s.isBlank()?null:s.trim();}
  private static final class SetUnits{static final java.util.Set<String> INTEIRAS=java.util.Set.of("UN","CX","PCT");}
}
