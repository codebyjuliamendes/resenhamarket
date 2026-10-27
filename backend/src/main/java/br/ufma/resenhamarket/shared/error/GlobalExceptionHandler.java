package br.ufma.resenhamarket.shared.error;

import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger log=LoggerFactory.getLogger(GlobalExceptionHandler.class);
  @ExceptionHandler(ApiException.class) ResponseEntity<ApiError> domain(ApiException e){return response(e.status(),e.code(),e.getMessage(),List.of());}
  @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<ApiError> validation(MethodArgumentNotValidException e){
    var fields=e.getBindingResult().getFieldErrors().stream().map(x->new ApiError.FieldError(x.getField(),x.getDefaultMessage())).toList();
    return response(HttpStatus.BAD_REQUEST,"VALIDACAO","Confira os campos destacados.",fields);
  }
  @ExceptionHandler(BadCredentialsException.class) ResponseEntity<ApiError> credentials(){return response(HttpStatus.UNAUTHORIZED,"CREDENCIAIS_INVALIDAS","E-mail ou senha incorretos.",List.of());}
  @ExceptionHandler(AccessDeniedException.class) ResponseEntity<ApiError> denied(){return response(HttpStatus.FORBIDDEN,"ACESSO_NEGADO","Seu perfil não permite esta ação.",List.of());}
  @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<ApiError> conflict(){return response(HttpStatus.CONFLICT,"DADO_DUPLICADO","Já existe um registro com esses dados.",List.of());}
  @ExceptionHandler(ObjectOptimisticLockingFailureException.class) ResponseEntity<ApiError> stale(){return response(HttpStatus.CONFLICT,"REGISTRO_ALTERADO","Este registro foi alterado por outra pessoa. Recarregue e tente de novo.",List.of());}
  @ExceptionHandler(ConstraintViolationException.class) ResponseEntity<ApiError> constraint(ConstraintViolationException e){return response(HttpStatus.BAD_REQUEST,"VALIDACAO",e.getMessage(),List.of());}
  @ExceptionHandler({HttpMessageNotReadableException.class,MethodArgumentTypeMismatchException.class,MissingServletRequestParameterException.class}) ResponseEntity<ApiError> badRequest(){return response(HttpStatus.BAD_REQUEST,"REQUISICAO_INVALIDA","Os dados enviados não estão no formato esperado.",List.of());}
  @ExceptionHandler(HttpRequestMethodNotSupportedException.class) ResponseEntity<ApiError> method(){return response(HttpStatus.METHOD_NOT_ALLOWED,"METODO_NAO_SUPORTADO","Operação não suportada neste endereço.",List.of());}
  @ExceptionHandler(NoResourceFoundException.class) ResponseEntity<ApiError> notFound(){return response(HttpStatus.NOT_FOUND,"NAO_ENCONTRADO","Endereço não encontrado.",List.of());}
  @ExceptionHandler(Exception.class) ResponseEntity<ApiError> unexpected(Exception e){log.error("Erro inesperado",e);return response(HttpStatus.INTERNAL_SERVER_ERROR,"ERRO_INTERNO","Algo deu errado do nosso lado. Tente novamente em instantes.",List.of());}
  private ResponseEntity<ApiError> response(HttpStatus s,String code,String message,List<ApiError.FieldError> fields){return ResponseEntity.status(s).body(new ApiError(s.value(),code,message,fields,Instant.now()));}
}
