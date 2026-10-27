import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {api,type Usuario} from '../api/client';
type Auth={user:Usuario|null;login:(email:string,senha:string)=>Promise<void>;logout:()=>void};
const Context=createContext<Auth|null>(null);
export function AuthProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<Usuario|null>(()=>{try{return JSON.parse(sessionStorage.getItem('resenha.user')||'null')}catch{return null}});
 const logout=()=>{sessionStorage.removeItem('resenha.token');sessionStorage.removeItem('resenha.user');setUser(null)};
 useEffect(()=>{window.addEventListener('resenha:unauthorized',logout);return()=>window.removeEventListener('resenha:unauthorized',logout)},[]);
 const login=async(email:string,senha:string)=>{const data=await api<{token:string;usuario:Usuario}>('/auth/login',{method:'POST',body:JSON.stringify({email,senha})});sessionStorage.setItem('resenha.token',data.token);sessionStorage.setItem('resenha.user',JSON.stringify(data.usuario));setUser(data.usuario)};
 const value=useMemo(()=>({user,login,logout}),[user]);return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth(){const context=useContext(Context);if(!context)throw new Error('AuthProvider ausente');return context;}
