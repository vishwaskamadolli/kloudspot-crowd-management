import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import { authStore,login as loginRequest } from '../lib/api';
type Auth={authenticated:boolean;login:(email:string,password:string)=>Promise<void>;logout:()=>void};
const Context=createContext<Auth|null>(null);
export function AuthProvider({children}:{children:ReactNode}){const [authenticated,setAuthenticated]=useState(Boolean(authStore.get()));useEffect(()=>{const unauth=()=>setAuthenticated(false);addEventListener('auth:unauthorized',unauth);return()=>removeEventListener('auth:unauthorized',unauth)},[]);return <Context.Provider value={{authenticated,login:async(e,p)=>{await loginRequest(e,p);setAuthenticated(true)},logout:()=>{authStore.clear();setAuthenticated(false)}}}>{children}</Context.Provider>}
export const useAuth=()=>{const value=useContext(Context);if(!value)throw new Error('AuthProvider missing');return value};
