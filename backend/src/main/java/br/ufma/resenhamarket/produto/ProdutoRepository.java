package br.ufma.resenhamarket.produto;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface ProdutoRepository extends JpaRepository<Produto,Long>{
  @Query("select p from Produto p where (:ativo is null or p.ativo=:ativo) and (lower(p.nome) like lower(concat('%',:busca,'%')) or lower(p.codigo) like lower(concat('%',:busca,'%'))) order by p.nome")
  List<Produto> buscar(@Param("busca") String busca,@Param("ativo") Boolean ativo);
  @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select p from Produto p where p.id=:id") Optional<Produto> buscarParaMovimentacao(@Param("id") Long id);
  @Query("select count(p) from Produto p where lower(trim(p.codigo))=lower(trim(:codigo)) and (:id is null or p.id<>:id)") long contarCodigo(@Param("codigo") String codigo,@Param("id") Long id);
}
