package br.ufma.resenhamarket;

import java.sql.DriverManager;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * PostgreSQL for integration tests. Uses Testcontainers when Docker is available (CI). Without Docker,
 * set TEST_DATABASE_URL (e.g. jdbc:postgresql://localhost:5432/postgres), TEST_DATABASE_USER and
 * TEST_DATABASE_PASSWORD to run against an existing server: each test class gets a fresh database.
 */
final class TestDatabase {
  private TestDatabase(){}
  private static final String EXTERNAL=System.getenv("TEST_DATABASE_URL");
  private static PostgreSQLContainer<?> container;

  /** Used by @EnabledIf: the integration tests are skipped when no database can be provided. */
  static boolean available(){return EXTERNAL!=null&&!EXTERNAL.isBlank()||DockerClientFactory.instance().isDockerAvailable();}

  static synchronized void register(DynamicPropertyRegistry r,String name){
    if(EXTERNAL!=null&&!EXTERNAL.isBlank()){
      String user=env("TEST_DATABASE_USER","postgres"),password=env("TEST_DATABASE_PASSWORD","");
      String db="resenha_test_"+name;
      try(var c=DriverManager.getConnection(EXTERNAL,user,password);var s=c.createStatement()){
        s.execute("DROP DATABASE IF EXISTS "+db+" WITH (FORCE)");s.execute("CREATE DATABASE "+db);
      }catch(Exception e){throw new IllegalStateException("Não foi possível preparar o banco de teste "+db,e);}
      String url=EXTERNAL.substring(0,EXTERNAL.lastIndexOf('/')+1)+db;
      r.add("spring.datasource.url",()->url);r.add("spring.datasource.username",()->user);r.add("spring.datasource.password",()->password);
      return;
    }
    if(container==null){container=new PostgreSQLContainer<>("postgres:16-alpine").withDatabaseName("resenha_test").withUsername("resenha").withPassword("resenha_test");container.start();}
    // Each test class gets its own database inside the shared container.
    String db="resenha_test_"+name;
    try(var c=DriverManager.getConnection(container.getJdbcUrl(),container.getUsername(),container.getPassword());var s=c.createStatement()){
      s.execute("DROP DATABASE IF EXISTS "+db);s.execute("CREATE DATABASE "+db);
    }catch(Exception e){throw new IllegalStateException(e);}
    String url=container.getJdbcUrl().replace("/resenha_test","/"+db);
    r.add("spring.datasource.url",()->url);r.add("spring.datasource.username",container::getUsername);r.add("spring.datasource.password",container::getPassword);
  }
  private static String env(String k,String d){var v=System.getenv(k);return v==null?d:v;}
}
