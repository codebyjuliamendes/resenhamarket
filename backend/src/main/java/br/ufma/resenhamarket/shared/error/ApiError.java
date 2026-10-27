package br.ufma.resenhamarket.shared.error;

import java.time.Instant;
import java.util.List;

public record ApiError(int status,String codigo,String mensagem,List<FieldError> campos,Instant timestamp){
  public record FieldError(String campo,String mensagem){}
}
