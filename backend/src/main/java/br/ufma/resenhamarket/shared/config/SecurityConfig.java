package br.ufma.resenhamarket.shared.config;

import br.ufma.resenhamarket.shared.error.ApiError;
import br.ufma.resenhamarket.shared.security.JwtAuthFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration @EnableMethodSecurity
public class SecurityConfig {
  @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder(10);}
  @Bean SecurityFilterChain securityFilterChain(HttpSecurity http,JwtAuthFilter jwtFilter,ObjectMapper mapper)throws Exception{
    return http.csrf(AbstractHttpConfigurer::disable).cors(c->{}).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(a->a.requestMatchers("/api/v1/auth/login","/actuator/health/**","/swagger-ui/**","/swagger-ui.html","/v3/api-docs/**").permitAll()
        .requestMatchers(HttpMethod.POST,"/api/v1/produtos/**").hasRole("ADMINISTRADOR")
        .requestMatchers(HttpMethod.PUT,"/api/v1/produtos/**").hasRole("ADMINISTRADOR")
        .requestMatchers(HttpMethod.PATCH,"/api/v1/produtos/**").hasRole("ADMINISTRADOR")
        .requestMatchers("/api/v1/usuarios/**").hasRole("ADMINISTRADOR").anyRequest().authenticated())
      // Sem token válido responde 401 (o cliente web encerra a sessão); sem permissão responde 403, ambos no formato ApiError.
      .exceptionHandling(e->e.authenticationEntryPoint((req,res,ex)->write(res,mapper,HttpStatus.UNAUTHORIZED,"NAO_AUTENTICADO","Sua sessão expirou. Entre novamente."))
        .accessDeniedHandler((req,res,ex)->write(res,mapper,HttpStatus.FORBIDDEN,"ACESSO_NEGADO","Seu perfil não permite esta ação.")))
      .addFilterBefore(jwtFilter,UsernamePasswordAuthenticationFilter.class).build();
  }
  private static void write(HttpServletResponse res,ObjectMapper mapper,HttpStatus status,String code,String message)throws IOException{
    res.setStatus(status.value());res.setContentType(MediaType.APPLICATION_JSON_VALUE);res.setCharacterEncoding("UTF-8");
    mapper.writeValue(res.getOutputStream(),new ApiError(status.value(),code,message,List.of(),Instant.now()));
  }
  // Aceita padrões (ex.: https://resenhamarket-*.vercel.app) para as prévias de deploy da Vercel.
  @Bean CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.origins}") String origins){
    CorsConfiguration c=new CorsConfiguration();c.setAllowedOriginPatterns(Arrays.stream(origins.split(",")).map(String::trim).filter(s->!s.isEmpty()).toList());
    c.setAllowedMethods(List.of("GET","POST","PUT","PATCH","OPTIONS"));c.setAllowedHeaders(List.of("Authorization","Content-Type"));c.setExposedHeaders(List.of("Location"));
    UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource();source.registerCorsConfiguration("/**",c);return source;
  }
}
