import { useEffect,useRef,useState } from 'react';
import { io } from 'socket.io-client';
import { authStore } from '../lib/api';
import type { Alert } from '../types';

type OccupancyEvent={ts?:number|string;siteId:string|number;siteOccupancy:number|string;zoneId:string;zoneOccupancy:number|string};
type AlertEvent={ts:number|string;eventId:string|number;direction:string;personName?:string;severity:string;zoneName?:string;zoneId:string;siteName?:string;siteId:string|number;personId?:string};
const sameId=(left:string|number,right:string|number)=>String(left).trim()===String(right).trim();
const asArray=<T,>(payload:T|T[])=>Array.isArray(payload)?payload:[payload];

export function useLiveUpdates(siteId:string,onOccupancy:(value:number)=>void,onAlert:(alert:Alert)=>void){
  const [connected,setConnected]=useState(false);
  const seenAlerts=useRef(new Set<string>());
  useEffect(()=>{
    if(!siteId)return;
    const socket=io(import.meta.env.VITE_SOCKET_URL||import.meta.env.VITE_API_BASE_URL||'https://hiring-dev.internal.kloudspot.com',{auth:{token:authStore.get()},transports:['websocket'],reconnection:true});
    const occupancyEvent=import.meta.env.VITE_SOCKET_OCCUPANCY_EVENT||'live_occupancy';
    const alertEvent=import.meta.env.VITE_SOCKET_ALERT_EVENT||'alert';
    const handleConnect=()=>setConnected(true);
    const handleDisconnect=()=>setConnected(false);
    const handleOccupancy=(payload:OccupancyEvent|OccupancyEvent[])=>{
      const latest=asArray(payload).filter(event=>event&&sameId(event.siteId,siteId)).at(-1);
      if(!latest)return;
      const value=Number(latest.siteOccupancy);
      if(Number.isFinite(value))onOccupancy(value);
    };
    const handleAlerts=(payload:AlertEvent|AlertEvent[])=>{
      for(const event of asArray(payload)){
        if(!event)continue;
        const eventId=String(event.eventId??'').trim();
        if(!sameId(event.siteId,siteId)||!eventId||seenAlerts.current.has(eventId))continue;
        seenAlerts.current.add(eventId);
        const timestamp=Number(event.ts);
        onAlert({id:eventId,title:event.personName?`${event.personName} · ${event.direction}`:event.direction,message:[event.severity,event.zoneName,event.siteName].filter(Boolean).join(' · '),severity:event.severity==='critical'?'critical':event.severity==='warning'?'warning':'info',timestamp:Number.isFinite(timestamp)?timestamp:Date.now()});
      }
    };
    socket.on('connect',handleConnect);socket.on('disconnect',handleDisconnect);socket.on('connect_error',handleDisconnect);socket.on(occupancyEvent,handleOccupancy);socket.on(alertEvent,handleAlerts);
    return()=>{socket.off('connect',handleConnect);socket.off('disconnect',handleDisconnect);socket.off('connect_error',handleDisconnect);socket.off(occupancyEvent,handleOccupancy);socket.off(alertEvent,handleAlerts);socket.disconnect()};
  },[siteId,onAlert,onOccupancy]);
  return connected;
}
