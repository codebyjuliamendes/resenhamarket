package br.ufma.resenhamarket.usuario;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="usuario")
public class Usuario {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @Column(nullable=false,length=120) private String nome;
  @Column(nullable=false,length=160,unique=true) private String email;
  @Column(name="senha_hash",nullable=false,length=100) private String senhaHash;
  @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private Perfil perfil;
  @Column(nullable=false) private boolean ativo=true;
  @Column(name="criado_em",nullable=false,updatable=false) private Instant criadoEm;
  @Column(name="atualizado_em",nullable=false) private Instant atualizadoEm;
  protected Usuario(){}
  public Long getId(){return id;} public String getNome(){return nome;} public String getEmail(){return email;} public String getSenhaHash(){return senhaHash;} public Perfil getPerfil(){return perfil;} public boolean isAtivo(){return ativo;}
  public static Usuario criar(String nome,String email,String hash,Perfil perfil){var u=new Usuario();u.nome=nome;u.email=email;u.senhaHash=hash;u.perfil=perfil;u.ativo=true;u.criadoEm=Instant.now();u.atualizadoEm=u.criadoEm;return u;}
}
