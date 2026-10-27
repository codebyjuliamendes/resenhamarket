package br.ufma.resenhamarket;

import static org.assertj.core.api.Assertions.assertThat;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker=true)
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties="app.seed.enabled=true")
class SaldoConfiabilidadeTest {
  @Container static final PostgreSQLContainer<?> postgres=new PostgreSQLContainer<>("postgres:16-alpine").withDatabaseName("resenha_test").withUsername("resenha").withPassword("resenha_test");
  @DynamicPropertySource static void database(DynamicPropertyRegistry r){r.add("spring.datasource.url",postgres::getJdbcUrl);r.add("spring.datasource.username",postgres::getUsername);r.add("spring.datasource.password",postgres::getPassword);}
  @LocalServerPort int port;@Autowired TestRestTemplate http;@Autowired ObjectMapper mapper;
  private String base(){return "http://localhost:"+port+"/api/v1";}
  private String token(String email,String senha){var response=http.postForEntity(base()+"/auth/login",Map.of("email",email,"senha",senha),JsonNode.class);assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);return response.getBody().path("token").asText();}
  private HttpHeaders auth(String jwt){var h=new HttpHeaders();h.setBearerAuth(jwt);h.setContentType(MediaType.APPLICATION_JSON);return h;}
  @Test void stockLedgerAndRoleProtectionRemainConsistentAcrossThirtyMovements()throws Exception{
    String admin=token("admin@resenha.dev","admin123");String operator=token("operador@resenha.dev","operador123");
    var denied=http.exchange(base()+"/produtos",HttpMethod.POST,new HttpEntity<>(Map.of("codigo","NOPE","nome","Nope","unidadeMedida","UN"),auth(operator)),String.class);
    assertThat(denied.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    var created=http.exchange(base()+"/produtos",HttpMethod.POST,new HttpEntity<>(Map.of("codigo","IT-"+System.nanoTime(),"nome","Produto para teste de saldo","unidadeMedida","KG","estoqueMinimo",0),auth(admin)),String.class);
    assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    JsonNode product=mapper.readTree(created.getBody());long id=product.path("id").asLong();
    for(int i=0;i<30;i++){
      String type=i%2==0?"ENTRADA":"SAIDA";String qty=i%2==0?"1.250":"0.500";
      var movement=http.exchange(base()+"/movimentacoes",HttpMethod.POST,new HttpEntity<>(Map.of("produtoId",id,"tipo",type,"quantidade",qty,"motivo","AJUSTE"),auth(operator)),String.class);
      assertThat(movement.getStatusCode()).isEqualTo(HttpStatus.CREATED);
      JsonNode m=mapper.readTree(movement.getBody());assertThat(m.path("saldoApos").decimalValue()).isEqualByComparingTo(i%2==0?java.math.BigDecimal.valueOf((i/2+1)*1.25-(i/2)*.5):java.math.BigDecimal.valueOf((i/2+1)*1.25-(i/2+1)*.5));
    }
    var check=http.exchange(base()+"/produtos/"+id+"/saldo",HttpMethod.GET,new HttpEntity<>(auth(operator)),JsonNode.class);
    assertThat(check.getStatusCode()).isEqualTo(HttpStatus.OK);assertThat(check.getBody().path("consistente").asBoolean()).isTrue();assertThat(check.getBody().path("saldoAtual").decimalValue()).isEqualByComparingTo("11.250");
    var invalid=http.exchange(base()+"/movimentacoes",HttpMethod.POST,new HttpEntity<>(Map.of("produtoId",id,"tipo","SAIDA","quantidade",100,"motivo","VENDA"),auth(operator)),JsonNode.class);
    assertThat(invalid.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    var after=http.exchange(base()+"/produtos/"+id+"/saldo",HttpMethod.GET,new HttpEntity<>(auth(operator)),JsonNode.class);assertThat(after.getBody().path("saldoAtual").decimalValue()).isEqualByComparingTo("11.250");
  }
}
