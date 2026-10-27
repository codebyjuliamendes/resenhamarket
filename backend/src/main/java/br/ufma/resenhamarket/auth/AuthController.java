package br.ufma.resenhamarket.auth;

import br.ufma.resenhamarket.shared.error.ApiException;
import br.ufma.resenhamarket.shared.security.JwtService;
import br.ufma.resenhamarket.shared.security.LoginAttemptLimiter;
import br.ufma.resenhamarket.usuario.Usuario;
import br.ufma.resenhamarket.usuario.UsuarioRepository;
import br.ufma.resenhamarket.usuario.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/auth")
public class AuthController {
  private final UsuarioRepository users; private final PasswordEncoder passwords; private final JwtService jwt; private final LoginAttemptLimiter limiter; private final UsuarioService usuarios; private final String dummyHash;
  public AuthController(UsuarioRepository users,PasswordEncoder passwords,JwtService jwt,LoginAttemptLimiter limiter,UsuarioService usuarios){this.users=users;this.passwords=passwords;this.jwt=jwt;this.limiter=limiter;this.usuarios=usuarios;this.dummyHash=passwords.encode(java.util.UUID.randomUUID().toString());}
  public record LoginRequest(@Email @NotBlank String email,@NotBlank String senha){}
  public record UserDto(Long id,String nome,String email,String perfil){}
  @PostMapping("/login") public Map<String,Object> login(@Valid @RequestBody LoginRequest body,HttpServletRequest request){
    String chave=body.email().trim().toLowerCase()+"|"+request.getRemoteAddr();
    if(limiter.bloqueado(chave))throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,"MUITAS_TENTATIVAS","Muitas tentativas sem sucesso. Aguarde "+limiter.minutosDeEspera()+" minutos e tente de novo.");
    // Sempre compara um hash (mesmo sem conta), para o tempo de resposta não revelar quais e-mails existem.
    Usuario candidato=users.findByEmailIgnoreCase(body.email().trim()).orElse(null);
    boolean senhaOk=passwords.matches(body.senha(),candidato==null?dummyHash:candidato.getSenhaHash());
    Usuario u=candidato!=null&&candidato.isAtivo()&&senhaOk?candidato:null;
    if(u==null){limiter.registrarFalha(chave);throw new ApiException(HttpStatus.UNAUTHORIZED,"CREDENCIAIS_INVALIDAS","E-mail ou senha incorretos.");}
    limiter.limpar(chave);
    return Map.of("token",jwt.create(u),"expiraEm",jwt.expirationSeconds(),"usuario",dto(u));
  }
  @GetMapping("/me") public UserDto me(Authentication auth){return users.findById((Long)auth.getPrincipal()).map(AuthController::dto)
    .orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"NAO_AUTENTICADO","Faça login novamente."));}
  @PutMapping("/senha") @ResponseStatus(HttpStatus.NO_CONTENT) public void alterarSenha(@Valid @RequestBody UsuarioService.SenhaInput body,Authentication auth){usuarios.alterarPropriaSenha((Long)auth.getPrincipal(),body);}
  private static UserDto dto(Usuario u){return new UserDto(u.getId(),u.getNome(),u.getEmail(),u.getPerfil().name());}
}
