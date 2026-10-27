package br.ufma.resenhamarket.demo;

import br.ufma.resenhamarket.movimentacao.MovimentacaoService;
import br.ufma.resenhamarket.movimentacao.TipoMovimentacao;
import br.ufma.resenhamarket.produto.Produto;
import br.ufma.resenhamarket.produto.ProdutoRepository;
import br.ufma.resenhamarket.usuario.Perfil;
import br.ufma.resenhamarket.usuario.Usuario;
import br.ufma.resenhamarket.usuario.UsuarioRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DemoSeed {
  private static final Logger log=LoggerFactory.getLogger(DemoSeed.class);

  @Bean @ConditionalOnProperty(name="app.seed.enabled",havingValue="true")
  CommandLineRunner seed(UsuarioRepository users,PasswordEncoder encoder,ProdutoRepository products,MovimentacaoService movements,JdbcTemplate jdbc,
      @Value("${app.seed.cenario:todos}") String cenario,@Value("${app.seed.reset:false}") boolean reset){return args->{
    List<CenarioDemo> cenarios=CenarioDemo.resolver(cenario);
    if(users.count()==0){users.save(Usuario.criar("Administradora Demo","admin@resenha.dev",encoder.encode("admin123"),Perfil.ADMINISTRADOR));users.save(Usuario.criar("Operador Demo","operador@resenha.dev",encoder.encode("operador123"),Perfil.OPERADOR));}
    if(reset){
      log.warn("APP_SEED_RESET=true: apagando todos os produtos e movimentações antes de carregar a demonstração. Volte a flag para false depois.");
      jdbc.execute("TRUNCATE movimentacao, produto RESTART IDENTITY");
    }
    if(products.count()>0){log.info("Demonstração não carregada: já existem produtos. Use APP_SEED_RESET=true para recomeçar.");return;}
    Usuario admin=users.findByEmailIgnoreCase("admin@resenha.dev").orElse(null);
    if(admin==null){log.warn("Demonstração não carregada: conta admin@resenha.dev não existe.");return;}
    Usuario operador=users.findByEmailIgnoreCase("operador@resenha.dev").orElse(admin);
    for(CenarioDemo c:cenarios)for(var item:c.produtos()){
      Produto p=products.saveAndFlush(Produto.novo(item.codigo(),item.nome(),item.descricao(),item.unidade(),item.minimo()));
      for(var m:item.movimentos())movements.registrar(new MovimentacaoService.Entrada(p.getId(),m.tipo(),m.quantidade(),m.motivo(),m.observacao()),m.tipo()==TipoMovimentacao.ENTRADA?admin.getId():operador.getId());
    }
    log.info("Demonstração carregada: {}.",String.join(", ",cenarios.stream().map(CenarioDemo::rotulo).toList()));
  };}
}
