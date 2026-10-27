package br.ufma.resenhamarket.usuario;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import br.ufma.resenhamarket.produto.*;
import br.ufma.resenhamarket.movimentacao.*;
import java.math.BigDecimal;

@Configuration
public class DevSeed {
  @Bean @ConditionalOnProperty(name="app.seed.enabled",havingValue="true") CommandLineRunner seed(UsuarioRepository users,PasswordEncoder encoder,ProdutoRepository products,MovimentacaoService movements){return args->{
    if(users.count()==0){users.save(Usuario.criar("Administradora Demo","admin@resenha.dev",encoder.encode("admin123"),Perfil.ADMINISTRADOR));users.save(Usuario.criar("Operador Demo","operador@resenha.dev",encoder.encode("operador123"),Perfil.OPERADOR));}
    Usuario admin=users.findByEmailIgnoreCase("admin@resenha.dev").orElse(null);
    if(admin!=null&&products.count()==0){
      Object[][] sample={{"V-001","Camiseta básica","UN","18","6"},{"V-002","Caderno 10 matérias","UN","32","8"},{"V-003","Pilha AA cartela","CX","14","5"},{"F-001","Dipirona 500 mg caixa com 10","CX","24","8"},{"F-002","Álcool 70% 1 litro","UN","16","5"},{"F-003","Soro fisiológico","UN","30","10"},{"A-001","Farinha de trigo","KG","12.500","4"},{"A-002","Leite integral","L","20","8"},{"A-003","Ovos bandeja 30","PCT","9","3"}};
      for(Object[] row:sample){var p=products.saveAndFlush(Produto.novo((String)row[0],(String)row[1],null,(String)row[2],new BigDecimal((String)row[4])));movements.registrar(new MovimentacaoService.Entrada(p.getId(),TipoMovimentacao.ENTRADA,new BigDecimal((String)row[3]),MotivoMovimentacao.AJUSTE,"Saldo inicial da demonstração."),admin.getId());}
    }
  };}
}
