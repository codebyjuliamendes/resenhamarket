package br.ufma.resenhamarket.movimentacao;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
public interface MovimentacaoRepository extends JpaRepository<Movimentacao,Long>{
  @Query("select m from Movimentacao m where (:produtoId is null or m.produto.id=:produtoId) and (:tipo is null or m.tipo=:tipo) and (:de is null or m.criadoEm>=:de) and (:ate is null or m.criadoEm<:ate) order by m.criadoEm desc")
  List<Movimentacao> filtrar(@Param("produtoId")Long produtoId,@Param("tipo")TipoMovimentacao tipo,@Param("de")Instant de,@Param("ate")Instant ate,Pageable page);
  @Query(value="select coalesce(sum(case when tipo='ENTRADA' then quantidade else -quantidade end),0) from movimentacao where produto_id=:id",nativeQuery=true)
  BigDecimal saldoCalculado(@Param("id")Long id);
}
