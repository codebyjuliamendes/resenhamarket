package br.ufma.resenhamarket;

import static org.assertj.core.api.Assertions.assertThat;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
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

/** Regras de negócio e respostas de erro da API, uma por teste, contra PostgreSQL real. */
@Testcontainers(disabledWithoutDocker=true)
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties="app.seed.enabled=true")
class RegrasDeNegocioTest {
  @Container static final PostgreSQLContainer<?> postgres=new PostgreSQLContainer<>("postgres:16-alpine").withDatabaseName("resenha_test").withUsername("resenha").withPassword("resenha_test");
  @DynamicPropertySource static void database(DynamicPropertyRegistry r){r.add("spring.datasource.url",postgres::getJdbcUrl);r.add("spring.datasource.username",postgres::getUsername);r.add("spring.datasource.password",postgres::getPassword);}
  @LocalServerPort int port;@Autowired TestRestTemplate http;
  String admin,operador;

  @BeforeEach void entrar(){admin=token("admin@resenha.dev","admin123");operador=token("operador@resenha.dev","operador123");}
  private String base(){return "http://localhost:"+port+"/api/v1";}
  private String token(String email,String senha){return http.postForEntity(base()+"/auth/login",Map.of("email",email,"senha",senha),JsonNode.class).getBody().path("token").asText();}
  private ResponseEntity<JsonNode> call(HttpMethod method,String path,Object body,String jwt){var h=new HttpHeaders();h.setContentType(MediaType.APPLICATION_JSON);if(jwt!=null)h.setBearerAuth(jwt);return http.exchange(base()+path,method,new HttpEntity<>(body,h),JsonNode.class);}
  private ResponseEntity<JsonNode> raw(HttpMethod method,String path,String json,String jwt){var h=new HttpHeaders();h.setContentType(MediaType.APPLICATION_JSON);h.setBearerAuth(jwt);return http.exchange(base()+path,method,new HttpEntity<>(json,h),JsonNode.class);}
  private long produto(String unidade){return call(HttpMethod.POST,"/produtos",Map.of("codigo","RN-"+System.nanoTime(),"nome","Produto regra "+unidade,"unidadeMedida",unidade,"estoqueMinimo",2),admin).getBody().path("id").asLong();}
  private ResponseEntity<JsonNode> mov(long id,String tipo,Object qtd,String motivo){return call(HttpMethod.POST,"/movimentacoes",Map.of("produtoId",id,"tipo",tipo,"quantidade",qtd,"motivo",motivo),operador);}
  private static void codigo(ResponseEntity<JsonNode> r,HttpStatus status,String codigo){assertThat(r.getStatusCode()).isEqualTo(status);assertThat(r.getBody().path("codigo").asText()).isEqualTo(codigo);}

  @Test void validacaoDeCamposDevolveOsCamposComProblema(){
    var r=call(HttpMethod.POST,"/produtos",Map.of("codigo","","nome","","unidadeMedida","UN"),admin);
    codigo(r,HttpStatus.BAD_REQUEST,"VALIDACAO");
    assertThat(r.getBody().path("campos").findValuesAsText("campo")).contains("codigo","nome");
  }

  @Test void codigoDeProdutoEUnicoSemDiferenciarMaiusculas(){
    String c="DUP-"+System.nanoTime();
    assertThat(call(HttpMethod.POST,"/produtos",Map.of("codigo",c,"nome","Original","unidadeMedida","UN"),admin).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    codigo(call(HttpMethod.POST,"/produtos",Map.of("codigo"," "+c.toLowerCase()+" ","nome","Cópia","unidadeMedida","UN"),admin),HttpStatus.CONFLICT,"CODIGO_DUPLICADO");
  }

  @Test void edicaoMantemOSaldoEAtualizaOMinimo(){
    long id=produto("KG");mov(id,"ENTRADA","3.5","COMPRA");
    var r=call(HttpMethod.PUT,"/produtos/"+id,Map.of("codigo","ED-"+id,"nome","Produto editado","unidadeMedida","KG","estoqueMinimo","4"),admin);
    assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(r.getBody().path("saldoAtual").decimalValue()).isEqualByComparingTo("3.5");
    assertThat(r.getBody().path("abaixoDoMinimo").asBoolean()).isTrue();
    assertThat(call(HttpMethod.GET,"/produtos/"+id,null,operador).getBody().path("nome").asText()).isEqualTo("Produto editado");
  }

  @Test void unidadeInteiraRecusaFracaoEFracionadaAceitaAteTresCasas(){
    codigo(mov(produto("UN"),"ENTRADA","1.5","COMPRA"),HttpStatus.UNPROCESSABLE_ENTITY,"QUANTIDADE_FRACIONARIA");
    long kg=produto("KG");
    assertThat(mov(kg,"ENTRADA","1.375","COMPRA").getStatusCode()).isEqualTo(HttpStatus.CREATED);
    codigo(mov(kg,"ENTRADA","1.2345","COMPRA"),HttpStatus.UNPROCESSABLE_ENTITY,"QUANTIDADE_INVALIDA");
  }

  @Test void motivoPrecisaCombinarComOTipo(){
    codigo(mov(produto("UN"),"ENTRADA",1,"VENDA"),HttpStatus.UNPROCESSABLE_ENTITY,"MOTIVO_INCOMPATIVEL");
  }

  @Test void quantidadeZeroOuNegativaERecusada(){
    long id=produto("UN");
    codigo(mov(id,"ENTRADA",0,"COMPRA"),HttpStatus.BAD_REQUEST,"VALIDACAO");
    codigo(mov(id,"ENTRADA",-1,"COMPRA"),HttpStatus.BAD_REQUEST,"VALIDACAO");
  }

  @Test void produtoInexistenteDevolve404(){
    codigo(call(HttpMethod.GET,"/produtos/999999",null,operador),HttpStatus.NOT_FOUND,"PRODUTO_NAO_ENCONTRADO");
    codigo(mov(999999,"ENTRADA",1,"COMPRA"),HttpStatus.NOT_FOUND,"PRODUTO_NAO_ENCONTRADO");
    codigo(call(HttpMethod.GET,"/produtos/999999/saldo",null,operador),HttpStatus.NOT_FOUND,"PRODUTO_NAO_ENCONTRADO");
  }

  @Test void requisicoesMalFormadasDevolvem400(){
    codigo(raw(HttpMethod.POST,"/movimentacoes","{quebrado",operador),HttpStatus.BAD_REQUEST,"REQUISICAO_INVALIDA");
    codigo(call(HttpMethod.GET,"/movimentacoes?tipo=TROCA",null,operador),HttpStatus.BAD_REQUEST,"REQUISICAO_INVALIDA");
    codigo(call(HttpMethod.GET,"/produtos/abc",null,operador),HttpStatus.BAD_REQUEST,"REQUISICAO_INVALIDA");
  }

  @Test void historicoFiltraPorPeriodoERecusaPeriodoInvertido(){
    long id=produto("UN");mov(id,"ENTRADA",4,"COMPRA");mov(id,"SAIDA",1,"VENDA");
    Instant agora=Instant.now();
    var dentro=call(HttpMethod.GET,"/movimentacoes?produtoId="+id+"&de="+agora.minus(1,ChronoUnit.HOURS)+"&ate="+agora.plus(1,ChronoUnit.HOURS),null,operador).getBody();
    assertThat(dentro.path("totalElements").asLong()).isEqualTo(2);
    assertThat(dentro.path("content").get(0).path("tipo").asText()).isEqualTo("SAIDA");
    var fora=call(HttpMethod.GET,"/movimentacoes?produtoId="+id+"&ate="+agora.minus(1,ChronoUnit.HOURS),null,operador).getBody();
    assertThat(fora.path("totalElements").asLong()).isZero();
    codigo(call(HttpMethod.GET,"/movimentacoes?de="+agora+"&ate="+agora.minus(1,ChronoUnit.DAYS),null,operador),HttpStatus.BAD_REQUEST,"PERIODO_INVALIDO");
  }

  @Test void filtroAbaixoDoMinimoIncluiOLimiteEIgnoraMinimoZero(){
    long id=produto("UN");mov(id,"ENTRADA",2,"COMPRA");
    var lista=call(HttpMethod.GET,"/produtos?abaixoDoMinimo=true",null,operador).getBody();
    assertThat(lista.findValues("id").stream().anyMatch(n->n.asLong()==id)).as("saldo igual ao mínimo entra no alerta").isTrue();
    long semMinimo=call(HttpMethod.POST,"/produtos",Map.of("codigo","SM-"+System.nanoTime(),"nome","Sem mínimo","unidadeMedida","UN","estoqueMinimo",0),admin).getBody().path("id").asLong();
    assertThat(call(HttpMethod.GET,"/produtos/"+semMinimo,null,operador).getBody().path("abaixoDoMinimo").asBoolean()).isFalse();
  }

  @Test void edicaoEReativacaoDeUsuario(){
    String email="ed."+System.nanoTime()+"@resenha.dev";
    long id=call(HttpMethod.POST,"/usuarios",Map.of("nome","Pessoa","email",email,"perfil","OPERADOR","senha","senha-inicial-1"),admin).getBody().path("id").asLong();
    codigo(call(HttpMethod.POST,"/usuarios",Map.of("nome","Sem senha","email","s"+email,"perfil","OPERADOR"),admin),HttpStatus.BAD_REQUEST,"SENHA_OBRIGATORIA");
    Map<String,Object> edicao=new HashMap<>(Map.of("nome","Pessoa Promovida","email",email,"perfil","ADMINISTRADOR"));
    var r=call(HttpMethod.PUT,"/usuarios/"+id,edicao,admin);
    assertThat(r.getBody().path("perfil").asText()).isEqualTo("ADMINISTRADOR");
    edicao.put("senha","senha-nova-123");
    call(HttpMethod.PUT,"/usuarios/"+id,edicao,admin);
    assertThat(token(email,"senha-nova-123")).isNotBlank();
    call(HttpMethod.PATCH,"/usuarios/"+id+"/inativar",null,admin);
    assertThat(call(HttpMethod.PATCH,"/usuarios/"+id+"/reativar",null,admin).getBody().path("ativo").asBoolean()).isTrue();
    codigo(call(HttpMethod.PUT,"/usuarios/999999",edicao,admin),HttpStatus.NOT_FOUND,"USUARIO_NAO_ENCONTRADO");
  }

  @Test void meDevolveOUsuarioDoToken(){
    var me=call(HttpMethod.GET,"/auth/me",null,operador).getBody();
    assertThat(me.path("email").asText()).isEqualTo("operador@resenha.dev");
    assertThat(me.path("perfil").asText()).isEqualTo("OPERADOR");
  }
}
