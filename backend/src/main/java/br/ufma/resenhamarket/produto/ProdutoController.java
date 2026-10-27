package br.ufma.resenhamarket.produto;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/produtos")
public class ProdutoController {
  private final ProdutoService service;
  public ProdutoController(ProdutoService service){this.service=service;}
  @GetMapping public List<ProdutoService.ProdutoDto> listar(@RequestParam(required=false)String busca,@RequestParam(defaultValue="true")Boolean ativo,@RequestParam(required=false)Boolean abaixoDoMinimo){return service.listar(busca,ativo,abaixoDoMinimo);}
  @GetMapping("/{id}") public ProdutoService.ProdutoDto buscar(@PathVariable Long id){return service.buscar(id);}
  @PostMapping @ResponseStatus(HttpStatus.CREATED) public ProdutoService.ProdutoDto criar(@Valid @RequestBody ProdutoService.ProdutoInput in){return service.criar(in);}
  @PutMapping("/{id}") public ProdutoService.ProdutoDto atualizar(@PathVariable Long id,@Valid @RequestBody ProdutoService.ProdutoInput in){return service.atualizar(id,in);}
  @PatchMapping("/{id}/inativar") public ProdutoService.ProdutoDto inativar(@PathVariable Long id){return service.inativar(id);}
  @PatchMapping("/{id}/reativar") public ProdutoService.ProdutoDto reativar(@PathVariable Long id){return service.reativar(id);}
}
