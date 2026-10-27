package br.ufma.resenhamarket.usuario;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
public interface UsuarioRepository extends JpaRepository<Usuario,Long>{
  Optional<Usuario> findByEmailIgnoreCase(String email);
  List<Usuario> findAllByOrderByNomeAsc();
  long countByPerfilAndAtivoTrue(Perfil perfil);
  @Query("select count(u) from Usuario u where lower(u.email)=lower(trim(:email)) and (:id is null or u.id<>:id)") long contarEmail(@Param("email") String email,@Param("id") Long id);
}
