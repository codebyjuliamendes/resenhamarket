package br.ufma.resenhamarket.shared.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Limita tentativas de login com falha por chave (e-mail + IP) dentro de uma janela de tempo. */
@Component
public class LoginAttemptLimiter {
  private record Janela(int falhas,Instant inicio){}
  private final Map<String,Janela> tentativas=new ConcurrentHashMap<>();
  private final int maxFalhas;private final Duration janela;private final Clock clock;
  @Autowired public LoginAttemptLimiter(@Value("${app.login.max-falhas:5}") int maxFalhas,@Value("${app.login.janela-minutos:15}") long minutos){this(maxFalhas,Duration.ofMinutes(minutos),Clock.systemUTC());}
  LoginAttemptLimiter(int maxFalhas,Duration janela,Clock clock){this.maxFalhas=maxFalhas;this.janela=janela;this.clock=clock;}
  public boolean bloqueado(String chave){var j=tentativas.get(chave);if(j==null)return false;if(expirou(j)){tentativas.remove(chave,j);return false;}return j.falhas()>=maxFalhas;}
  public void registrarFalha(String chave){
    if(tentativas.size()>10_000)tentativas.values().removeIf(this::expirou);
    tentativas.merge(chave,new Janela(1,clock.instant()),(atual,nova)->expirou(atual)?nova:new Janela(atual.falhas()+1,atual.inicio()));
  }
  public void limpar(String chave){tentativas.remove(chave);}
  public long minutosDeEspera(){return janela.toMinutes();}
  private boolean expirou(Janela j){return j.inicio().plus(janela).isBefore(clock.instant());}
}
