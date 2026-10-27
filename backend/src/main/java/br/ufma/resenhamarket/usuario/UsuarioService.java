package br.ufma.resenhamarket.usuario;

import br.ufma.resenhamarket.shared.error.ApiException;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @Transactional(readOnly=true)
public class UsuarioService {
  public record UsuarioInput(@NotBlank @Size(min=2,max=120) String nome,@NotBlank @Email @Size(max=160) String email,@NotNull Perfil perfil,@Size(min=8,max=72,message="A senha precisa ter entre 8 e 72 caracteres.") String senha){}
  public record SenhaInput(@NotBlank String senhaAtual,@NotBlank @Size(min=8,max=72,message="A nova senha precisa ter entre 8 e 72 caracteres.") String novaSenha){}
  public record UsuarioDto(Long id,String nome,String email,Perfil perfil,boolean ativo,Instant criadoEm,Instant atualizadoEm){}
  private final UsuarioRepository repo;private final PasswordEncoder passwords;
  public UsuarioService(UsuarioRepository repo,PasswordEncoder passwords){this.repo=repo;this.passwords=passwords;}

  @PreAuthorize("hasRole('ADMINISTRADOR')") public List<UsuarioDto> listar(){return repo.findAllByOrderByNomeAsc().stream().map(UsuarioService::dto).toList();}
  @Transactional @PreAuthorize("hasRole('ADMINISTRADOR')") public UsuarioDto criar(UsuarioInput in){
    if(in.senha()==null||in.senha().isBlank())throw new ApiException(HttpStatus.BAD_REQUEST,"SENHA_OBRIGATORIA","Defina uma senha inicial com pelo menos 8 caracteres.");
    validarEmail(in.email(),null);
    return dto(repo.saveAndFlush(Usuario.criar(in.nome(),in.email(),passwords.encode(in.senha()),in.perfil())));
  }
  @Transactional @PreAuthorize("hasRole('ADMINISTRADOR')") public UsuarioDto atualizar(Long id,UsuarioInput in,Long solicitanteId){
    var u=buscar(id);validarEmail(in.email(),id);
    if(u.getPerfil()==Perfil.ADMINISTRADOR&&in.perfil()!=Perfil.ADMINISTRADOR){
      if(id.equals(solicitanteId))throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"AUTO_REBAIXAMENTO","Você não pode remover o seu próprio perfil de administrador.");
      garantirOutroAdministrador(u);
    }
    u.atualizar(in.nome(),in.email(),in.perfil());
    if(in.senha()!=null&&!in.senha().isBlank())u.alterarSenha(passwords.encode(in.senha()));
    return dto(u);
  }
  @Transactional @PreAuthorize("hasRole('ADMINISTRADOR')") public UsuarioDto inativar(Long id,Long solicitanteId){
    var u=buscar(id);
    if(id.equals(solicitanteId))throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"AUTO_INATIVACAO","Você não pode inativar a sua própria conta.");
    if(u.getPerfil()==Perfil.ADMINISTRADOR)garantirOutroAdministrador(u);
    u.inativar();return dto(u);
  }
  @Transactional @PreAuthorize("hasRole('ADMINISTRADOR')") public UsuarioDto reativar(Long id){var u=buscar(id);u.reativar();return dto(u);}
  @Transactional public void alterarPropriaSenha(Long id,SenhaInput in){
    var u=buscar(id);
    if(!passwords.matches(in.senhaAtual(),u.getSenhaHash()))throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"SENHA_ATUAL_INCORRETA","A senha atual não confere.");
    u.alterarSenha(passwords.encode(in.novaSenha()));
  }
  private void garantirOutroAdministrador(Usuario u){if(u.isAtivo()&&repo.countByPerfilAndAtivoTrue(Perfil.ADMINISTRADOR)<=1)throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"ULTIMO_ADMINISTRADOR","É preciso manter pelo menos um administrador ativo.");}
  private void validarEmail(String email,Long id){if(repo.contarEmail(email,id)>0)throw new ApiException(HttpStatus.CONFLICT,"EMAIL_DUPLICADO","Este e-mail já está em uso.");}
  private Usuario buscar(Long id){return repo.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"USUARIO_NAO_ENCONTRADO","Usuário não encontrado."));}
  static UsuarioDto dto(Usuario u){return new UsuarioDto(u.getId(),u.getNome(),u.getEmail(),u.getPerfil(),u.isAtivo(),u.getCriadoEm(),u.getAtualizadoEm());}
}
