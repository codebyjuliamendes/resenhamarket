export type Perfil='ADMINISTRADOR'|'OPERADOR';
export type Usuario={id:number;nome:string;email:string;perfil:Perfil};
export type Produto={id:number;codigo:string;nome:string;descricao:string|null;unidadeMedida:string;estoqueMinimo:number;saldoAtual:number;abaixoDoMinimo:boolean;ativo:boolean;atualizadoEm:string};
export type Movimento={id:number;produtoId:number;produtoNome:string;produtoCodigo:string;tipo:'ENTRADA'|'SAIDA';quantidade:number;saldoApos:number;motivo:string;observacao:string|null;usuarioId:number;usuarioNome:string;criadoEm:string};
const token=()=>sessionStorage.getItem('resenha.token');
export async function api<T>(path:string,init:RequestInit={}):Promise<T>{
 const response=await fetch(`/api/v1${path}`,{...init,headers:{'Content-Type':'application/json',...(token()?{Authorization:`Bearer ${token()}`}:{ }),...init.headers}});
 const body=await response.json().catch(()=>null);
 if(response.status===401&&token())window.dispatchEvent(new Event('resenha:unauthorized'));
 if(!response.ok)throw new Error(body?.mensagem||'Não foi possível concluir. Tente novamente.');
 return body as T;
}
