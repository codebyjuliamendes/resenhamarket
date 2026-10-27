package br.ufma.resenhamarket.usuario;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/usuarios")
public class UsuarioController {
  private final UsuarioService service;
  public UsuarioController(UsuarioService service){this.service=service;}
  @GetMapping public List<UsuarioService.UsuarioDto> listar(){return service.listar();}
  @PostMapping @ResponseStatus(HttpStatus.CREATED) public UsuarioService.UsuarioDto criar(@Valid @RequestBody UsuarioService.UsuarioInput in){return service.criar(in);}
  @PutMapping("/{id}") public UsuarioService.UsuarioDto atualizar(@PathVariable Long id,@Valid @RequestBody UsuarioService.UsuarioInput in,Authentication auth){return service.atualizar(id,in,(Long)auth.getPrincipal());}
  @PatchMapping("/{id}/inativar") public UsuarioService.UsuarioDto inativar(@PathVariable Long id,Authentication auth){return service.inativar(id,(Long)auth.getPrincipal());}
  @PatchMapping("/{id}/reativar") public UsuarioService.UsuarioDto reativar(@PathVariable Long id){return service.reativar(id);}
}
