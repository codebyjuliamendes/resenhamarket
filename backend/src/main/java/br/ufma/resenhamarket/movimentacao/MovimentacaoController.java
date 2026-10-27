package br.ufma.resenhamarket.movimentacao;

import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1")
public class MovimentacaoController {
  private final MovimentacaoService service;public MovimentacaoController(MovimentacaoService service){this.service=service;}
  @PostMapping("/movimentacoes") @ResponseStatus(HttpStatus.CREATED) public MovimentacaoService.MovimentoDto registrar(@Valid @RequestBody MovimentacaoService.Entrada in,Authentication auth){return service.registrar(in,(Long)auth.getPrincipal());}
  @GetMapping("/movimentacoes") public List<MovimentacaoService.MovimentoDto> listar(@RequestParam(required=false)Long produtoId,@RequestParam(required=false)TipoMovimentacao tipo,@RequestParam(required=false)Instant de,@RequestParam(required=false)Instant ate,@RequestParam(defaultValue="0")Integer page,@RequestParam(defaultValue="30")Integer size){return service.listar(produtoId,tipo,de,ate,page,size);}
  @GetMapping("/produtos/{id}/saldo") public MovimentacaoService.SaldoDto conciliar(@PathVariable Long id){return service.conciliar(id);}
}
