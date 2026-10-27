package br.ufma.resenhamarket.shared.security;

import br.ufma.resenhamarket.usuario.Usuario;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(JwtService.class);
  private final SecretKey key;
  private final long expiration;
  public JwtService(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.expiration}") long expiration) {
    if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32)
      throw new IllegalStateException("APP_JWT_SECRET precisa ter pelo menos 32 bytes.");
    if (secret.startsWith("dev-only-")) log.warn("APP_JWT_SECRET usa o valor padrão de desenvolvimento. Defina um segredo forte antes de publicar.");
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); this.expiration = expiration;
  }
  public String create(Usuario user) {
    Instant now=Instant.now();
    return Jwts.builder().subject(user.getId().toString()).claim("email",user.getEmail()).claim("perfil",user.getPerfil().name())
      .issuedAt(Date.from(now)).expiration(Date.from(now.plusMillis(expiration))).signWith(key).compact();
  }
  public Claims parse(String token) {
    var c=Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    return new Claims(c.getSubject(),c.get("email",String.class),c.get("perfil",String.class));
  }
  public long expirationSeconds(){return expiration/1000;}
  public record Claims(String subject,String email,String perfil){}
}
