package br.ufma.resenhamarket.shared.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.Test;

class JwtServiceTest {
  @Test void recusaSegredoCurto(){
    assertThatThrownBy(()->JwtService.validarSegredo("curto",true)).hasMessageContaining("32 bytes");
  }
  @Test void segredoDeExemploSoValeNaDemonstracao(){
    String exemplo="dev-only-secret-change-before-deploy-0123456789abcdef";
    assertThatCode(()->JwtService.validarSegredo(exemplo,true)).doesNotThrowAnyException();
    assertThatThrownBy(()->JwtService.validarSegredo(exemplo,false)).hasMessageContaining("valor de exemplo");
    assertThatThrownBy(()->JwtService.validarSegredo("replace-with-a-random-secret-at-least-32-bytes-long",false)).hasMessageContaining("valor de exemplo");
  }
  @Test void informaExpiracaoEmSegundos(){
    var jwt=new JwtService("um-segredo-de-teste-com-mais-de-32-bytes-0123",60_000,false);
    assertThat(jwt.expirationSeconds()).isEqualTo(60);
  }
}
