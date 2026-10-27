package br.ufma.resenhamarket.auth;

import br.ufma.resenhamarket.shared.error.ApiException;
import br.ufma.resenhamarket.shared.security.JwtService;
import br.ufma.resenhamarket.usuario.Usuario;
import br.ufma.resenhamarket.usuario.UsuarioRepository;
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
  private final UsuarioRepository users; private final PasswordEncoder passwords; private final JwtService jwt;
  public AuthController(UsuarioRepository users,PasswordEncoder passwords,JwtService jwt){this.users=users;this.passwords=passwords;this.jwt=jwt;}
  public record LoginRequest(@Email @NotBlank String email,@NotBlank String senha){}
  public record UserDto(Long id,String nome,String email,String perfil){}
  @PostMapping("/login") public Map<String,Object> login(@Valid @RequestBody LoginRequest body){
    Usuario u=users.findByEmailIgnoreCase(body.email().trim()).filter(x->x.isAtivo()&&passwords.matches(body.senha(),x.getSenhaHash()))
      .orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"CREDENCIAIS_INVALIDAS","E-mail ou senha incorretos."));
    return Map.of("token",jwt.create(u),"expiraEm",jwt.expirationSeconds(),"usuario",dto(u));
  }
  @GetMapping("/me") public UserDto me(Authentication auth){return users.findById((Long)auth.getPrincipal()).map(AuthController::dto)
    .orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"NAO_AUTENTICADO","Faça login novamente."));}
  private static UserDto dto(Usuario u){return new UserDto(u.getId(),u.getNome(),u.getEmail(),u.getPerfil().name());}
}
