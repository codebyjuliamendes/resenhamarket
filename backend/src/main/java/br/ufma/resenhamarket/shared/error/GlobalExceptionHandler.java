package br.ufma.resenhamarket.shared.error;

import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(ApiException.class) ResponseEntity<ApiError> domain(ApiException e){return response(e.status(),e.code(),e.getMessage(),List.of());}
  @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<ApiError> validation(MethodArgumentNotValidException e){
    var fields=e.getBindingResult().getFieldErrors().stream().map(x->new ApiError.FieldError(x.getField(),x.getDefaultMessage())).toList();
    return response(HttpStatus.BAD_REQUEST,"VALIDACAO","Confira os campos destacados.",fields);
  }
  @ExceptionHandler(BadCredentialsException.class) ResponseEntity<ApiError> credentials(){return response(HttpStatus.UNAUTHORIZED,"CREDENCIAIS_INVALIDAS","E-mail ou senha incorretos.",List.of());}
  @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<ApiError> conflict(){return response(HttpStatus.CONFLICT,"DADO_DUPLICADO","Já existe um registro com esses dados.",List.of());}
  @ExceptionHandler(ConstraintViolationException.class) ResponseEntity<ApiError> constraint(ConstraintViolationException e){return response(HttpStatus.BAD_REQUEST,"VALIDACAO",e.getMessage(),List.of());}
  private ResponseEntity<ApiError> response(HttpStatus s,String code,String message,List<ApiError.FieldError> fields){return ResponseEntity.status(s).body(new ApiError(s.value(),code,message,fields,Instant.now()));}
}
