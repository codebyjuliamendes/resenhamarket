package br.ufma.resenhamarket;

import static org.assertj.core.api.Assertions.assertThat;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
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
class RegrasDeAcessoEConcorrenciaTest {
  @Container static final PostgreSQLContainer<?> postgres=new PostgreSQLContainer<>("postgres:16-alpine").withDatabaseName("resenha_test").withUsername("resenha").withPassword("resenha_test");
  @DynamicPropertySource static void database(DynamicPropertyRegistry r){r.add("spring.datasource.url",postgres::getJdbcUrl);r.add("spring.datasource.username",postgres::getUsername);r.add("spring.datasource.password",postgres::getPassword);}
  @LocalServerPort int port;@Autowired TestRestTemplate http;@Autowired ObjectMapper mapper;
  private String base(){return "http://localhost:"+port+"/api/v1";}
  private String token(String email,String senha){var response=http.postForEntity(base()+"/auth/login",Map.of("email",email,"senha",senha),JsonNode.class);assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);return response.getBody().path("token").asText();}
  private HttpHeaders auth(String jwt){var h=new HttpHeaders();h.setBearerAuth(jwt);h.setContentType(MediaType.APPLICATION_JSON);return h;}
  private ResponseEntity<JsonNode> call(HttpMethod method,String path,Object body,String jwt){return http.exchange(base()+path,method,new HttpEntity<>(body,jwt==null?new HttpHeaders():auth(jwt)),JsonNode.class);}

  @Test void vinteSaidasSimultaneasNuncaDeixamSaldoNegativo()throws Exception{
    String admin=token("admin@resenha.dev","admin123");String operator=token("operador@resenha.dev","operador123");
    long id=call(HttpMethod.POST,"/produtos",Map.of("codigo","CC-"+System.nanoTime(),"nome","Produto concorrente","unidadeMedida","UN","estoqueMinimo",0),admin).getBody().path("id").asLong();
    assertThat(call(HttpMethod.POST,"/movimentacoes",Map.of("produtoId",id,"tipo","ENTRADA","quantidade",10,"motivo","COMPRA"),admin).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    var pool=Executors.newFixedThreadPool(20);var start=new CountDownLatch(1);var results=new ArrayList<Future<HttpStatusCode>>();
    for(int i=0;i<20;i++)results.add(pool.submit(()->{start.await();return call(HttpMethod.POST,"/movimentacoes",Map.of("produtoId",id,"tipo","SAIDA","quantidade",1,"motivo","VENDA"),operator).getStatusCode();}));
    start.countDown();int created=0,rejected=0;
    for(var f:results){var s=f.get();if(s.equals(HttpStatus.CREATED))created++;else if(s.equals(HttpStatus.UNPROCESSABLE_ENTITY))rejected++;}
    pool.shutdown();
    assertThat(created).isEqualTo(10);assertThat(rejected).isEqualTo(10);
    var saldo=call(HttpMethod.GET,"/produtos/"+id+"/saldo",null,operator).getBody();
    assertThat(saldo.path("saldoAtual").decimalValue()).isZero();assertThat(saldo.path("consistente").asBoolean()).isTrue();
    var historico=call(HttpMethod.GET,"/movimentacoes?produtoId="+id+"&tipo=SAIDA&size=5",null,operator).getBody();
    assertThat(historico.path("totalElements").asLong()).isEqualTo(10);assertThat(historico.path("content").size()).isEqualTo(5);assertThat(historico.path("totalPages").asInt()).isEqualTo(2);
  }

  @Test void matrizDeAutorizacaoEGestaoDeUsuarios(){
    String admin=token("admin@resenha.dev","admin123");String operator=token("operador@resenha.dev","operador123");
    assertThat(call(HttpMethod.GET,"/produtos",null,null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(call(HttpMethod.GET,"/produtos",null,"token-invalido").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(call(HttpMethod.GET,"/usuarios",null,operator).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(call(HttpMethod.PATCH,"/produtos/1/inativar",null,operator).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(call(HttpMethod.GET,"/usuarios",null,admin).getStatusCode()).isEqualTo(HttpStatus.OK);

    String email="nova."+System.nanoTime()+"@resenha.dev";
    var created=call(HttpMethod.POST,"/usuarios",Map.of("nome","Nova Operadora","email",email,"perfil","OPERADOR","senha","senha-forte-1"),admin);
    assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);long novaId=created.getBody().path("id").asLong();
    assertThat(call(HttpMethod.POST,"/usuarios",Map.of("nome","Duplicada","email",email.toUpperCase(),"perfil","OPERADOR","senha","senha-forte-1"),admin).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    String nova=token(email,"senha-forte-1");
    assertThat(call(HttpMethod.PUT,"/auth/senha",Map.of("senhaAtual","errada","novaSenha","outra-senha-1"),nova).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    assertThat(call(HttpMethod.PUT,"/auth/senha",Map.of("senhaAtual","senha-forte-1","novaSenha","outra-senha-1"),nova).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    token(email,"outra-senha-1");

    assertThat(call(HttpMethod.PATCH,"/usuarios/"+novaId+"/inativar",null,admin).getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(http.postForEntity(base()+"/auth/login",Map.of("email",email,"senha","outra-senha-1"),JsonNode.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(call(HttpMethod.GET,"/produtos",null,nova).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

    long adminId=call(HttpMethod.GET,"/auth/me",null,admin).getBody().path("id").asLong();
    var selfInactivate=call(HttpMethod.PATCH,"/usuarios/"+adminId+"/inativar",null,admin);
    assertThat(selfInactivate.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);assertThat(selfInactivate.getBody().path("codigo").asText()).isEqualTo("AUTO_INATIVACAO");
    var demote=call(HttpMethod.PUT,"/usuarios/"+adminId,Map.of("nome","Administradora Demo","email","admin@resenha.dev","perfil","OPERADOR"),admin);
    assertThat(demote.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
  }

  @Test void produtoInativoSaiDaListaENaoAceitaMovimentacao(){
    String admin=token("admin@resenha.dev","admin123");
    long id=call(HttpMethod.POST,"/produtos",Map.of("codigo","IN-"+System.nanoTime(),"nome","Produto a inativar","unidadeMedida","UN"),admin).getBody().path("id").asLong();
    assertThat(call(HttpMethod.PATCH,"/produtos/"+id+"/inativar",null,admin).getBody().path("ativo").asBoolean()).isFalse();
    var movement=call(HttpMethod.POST,"/movimentacoes",Map.of("produtoId",id,"tipo","ENTRADA","quantidade",1,"motivo","COMPRA"),admin);
    assertThat(movement.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);assertThat(movement.getBody().path("codigo").asText()).isEqualTo("PRODUTO_INATIVO");
    var inactive=call(HttpMethod.GET,"/produtos?ativo=false",null,admin).getBody();
    assertThat(inactive.findValues("id").stream().anyMatch(n->n.asLong()==id)).isTrue();
    assertThat(call(HttpMethod.PATCH,"/produtos/"+id+"/reativar",null,admin).getBody().path("ativo").asBoolean()).isTrue();
  }
}
