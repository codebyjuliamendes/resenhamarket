package br.ufma.resenhamarket.shared.security;

import static org.assertj.core.api.Assertions.assertThat;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class LoginAttemptLimiterTest {
  static final class MutableClock extends Clock {
    Instant now=Instant.parse("2026-10-27T12:00:00Z");
    @Override public ZoneOffset getZone(){return ZoneOffset.UTC;} @Override public Clock withZone(java.time.ZoneId z){return this;} @Override public Instant instant(){return now;}
  }
  @Test void bloqueiaDepoisDoLimiteELiberaQuandoAJanelaExpira(){
    var clock=new MutableClock();var limiter=new LoginAttemptLimiter(3,Duration.ofMinutes(15),clock);
    for(int i=0;i<2;i++)limiter.registrarFalha("a@b.com|1.1.1.1");
    assertThat(limiter.bloqueado("a@b.com|1.1.1.1")).isFalse();
    limiter.registrarFalha("a@b.com|1.1.1.1");
    assertThat(limiter.bloqueado("a@b.com|1.1.1.1")).isTrue();
    assertThat(limiter.bloqueado("outro@b.com|1.1.1.1")).isFalse();
    clock.now=clock.now.plus(Duration.ofMinutes(16));
    assertThat(limiter.bloqueado("a@b.com|1.1.1.1")).isFalse();
  }
  @Test void loginComSucessoZeraAsFalhas(){
    var limiter=new LoginAttemptLimiter(2,Duration.ofMinutes(15),new MutableClock());
    limiter.registrarFalha("k");limiter.limpar("k");limiter.registrarFalha("k");
    assertThat(limiter.bloqueado("k")).isFalse();
  }
}
