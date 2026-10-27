package br.ufma.resenhamarket.produto;

import br.ufma.resenhamarket.shared.error.ApiException;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @Transactional(readOnly=true)
public class ProdutoService {
  public record ProdutoInput(@NotBlank @Size(max=40) String codigo,@NotBlank @Size(max=150) String nome,@Size(max=500) String descricao,@NotBlank @Size(max=10) String unidadeMedida,@DecimalMin("0") BigDecimal estoqueMinimo){}
  public record ProdutoDto(Long id,String codigo,String nome,String descricao,String unidadeMedida,BigDecimal estoqueMinimo,BigDecimal saldoAtual,boolean abaixoDoMinimo,boolean ativo,java.time.Instant atualizadoEm){}
  private final ProdutoRepository repo;
  public ProdutoService(ProdutoRepository repo){this.repo=repo;}
  public List<ProdutoDto> listar(String busca,Boolean ativo,Boolean abaixo){return repo.buscar(busca==null?"":busca.trim(),ativo).stream().map(this::dto).filter(p->!Boolean.TRUE.equals(abaixo)||p.abaixoDoMinimo()).toList();}
  public ProdutoDto buscar(Long id){return dto(repo.findById(id).orElseThrow(()->notFound()));}
  @Transactional @PreAuthorize("hasRole('ADMINISTRADOR')") public ProdutoDto criar(ProdutoInput in){validarCodigo(in.codigo(),null);var p=repo.saveAndFlush(Produto.novo(in.codigo(),in.nome(),in.descricao(),in.unidadeMedida(),in.estoqueMinimo()));return dto(p);}
  @Transactional @PreAuthorize("hasRole('ADMINISTRADOR')") public ProdutoDto atualizar(Long id,ProdutoInput in){var p=repo.findById(id).orElseThrow(()->notFound());validarCodigo(in.codigo(),id);p.atualizar(in.codigo(),in.nome(),in.descricao(),in.unidadeMedida(),in.estoqueMinimo());return dto(p);}
  @Transactional @PreAuthorize("hasRole('ADMINISTRADOR')") public ProdutoDto inativar(Long id){var p=repo.findById(id).orElseThrow(()->notFound());p.inativar();return dto(p);}
  @Transactional @PreAuthorize("hasRole('ADMINISTRADOR')") public ProdutoDto reativar(Long id){var p=repo.findById(id).orElseThrow(()->notFound());p.reativar();return dto(p);}
  private void validarCodigo(String code,Long id){if(repo.contarCodigo(code,id)>0)throw new ApiException(HttpStatus.CONFLICT,"CODIGO_DUPLICADO","Este código já está em uso.");}
  private ProdutoDto dto(Produto p){return new ProdutoDto(p.getId(),p.getCodigo(),p.getNome(),p.getDescricao(),p.getUnidadeMedida(),p.getEstoqueMinimo(),p.getSaldoAtual(),p.getEstoqueMinimo().signum()>0&&p.getSaldoAtual().compareTo(p.getEstoqueMinimo())<=0,p.isAtivo(),p.getAtualizadoEm());}
  private ApiException notFound(){return new ApiException(HttpStatus.NOT_FOUND,"PRODUTO_NAO_ENCONTRADO","Produto não encontrado.");}
}
