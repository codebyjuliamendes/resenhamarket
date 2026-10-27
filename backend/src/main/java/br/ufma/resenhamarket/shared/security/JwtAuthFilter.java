package br.ufma.resenhamarket.shared.security;

import br.ufma.resenhamarket.usuario.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
  private final JwtService jwt; private final UsuarioRepository users;
  public JwtAuthFilter(JwtService jwt, UsuarioRepository users){this.jwt=jwt;this.users=users;}
  @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException{
    String header=request.getHeader("Authorization");
    if(header!=null&&header.startsWith("Bearer "))try{
      var claims=jwt.parse(header.substring(7)); var user=users.findById(Long.valueOf(claims.subject())).orElse(null);
      if(user!=null&&user.isAtivo()){
        var auth=new UsernamePasswordAuthenticationToken(user.getId(),null,List.of(new SimpleGrantedAuthority("ROLE_"+user.getPerfil().name())));
        SecurityContextHolder.getContext().setAuthentication(auth);
      }
    }catch(Exception ignored){SecurityContextHolder.clearContext();}
    chain.doFilter(request,response);
  }
}
