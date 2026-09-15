import { useEffect, useRef } from 'react';
import { api } from '../lib/api';

interface EventCursorResponse{
  challengeId:string;
  stateVersion:number;
  cursor:string;
  events:Array<{id:string;eventType:string;createdAt:string}>;
}

const EVENT_PAGE_SIZE=100;
const MAX_DRAIN_PAGES=5;
const MAX_RETRY_MS=15000;

export function shouldContinueLiveChallengeEventDrain(eventCount:number,pagesDrained:number,maxPages=MAX_DRAIN_PAGES){
  return eventCount===EVENT_PAGE_SIZE&&pagesDrained<maxPages;
}

export function liveChallengeRetryDelay(pollMs:number,consecutiveFailures:number,maxRetryMs=MAX_RETRY_MS){
  if(consecutiveFailures<=0)return 0;
  const exponent=Math.min(consecutiveFailures,4);
  return Math.min(maxRetryMs,pollMs*(2**exponent));
}

/**
 * Near-realtime notification layer with deterministic REST recovery.
 *
 * Event rows are only a signal: callers always reload authoritative state.
 * A periodic recovery reload means a missed event, browser sleep or serverless
 * instance change cannot leave the UI permanently stale. A bounded backlog
 * drain advances through burst traffic without allowing one poll to monopolise
 * the browser or hammer the server indefinitely. Transient failures use a
 * bounded exponential retry window so an outage does not turn every connected
 * classroom client into a tight polling loop.
 */
export function useLiveChallengeSync(
  challengeId:string|null|undefined,
  onSync:()=>void|Promise<void>,
  options:{pollMs?:number;recoveryMs?:number}={},
){
  const callback=useRef(onSync);
  callback.current=onSync;
  const pollMs=options.pollMs??900;
  const recoveryMs=options.recoveryMs??5000;

  useEffect(()=>{
    if(!challengeId)return;
    let cancelled=false;
    let busy=false;
    let cursor='0';
    let lastRecovery=0;
    let consecutiveFailures=0;
    let retryAt=0;

    const tick=async(initial=false)=>{
      const startedAt=Date.now();
      if(cancelled||busy||(!initial&&startedAt<retryAt))return;
      busy=true;
      try{
        let pagesDrained=0;
        let sawEvents=false;
        let eventCount=0;
        do{
          const result=(await api<{data:EventCursorResponse}>(`/live-challenges/${challengeId}/events?after=${encodeURIComponent(cursor)}`)).data;
          if(cancelled)return;
          cursor=result.cursor;
          eventCount=result.events.length;
          sawEvents=sawEvents||eventCount>0;
          pagesDrained+=1;
        }while(!cancelled&&shouldContinueLiveChallengeEventDrain(eventCount,pagesDrained));

        consecutiveFailures=0;
        retryAt=0;
        const now=Date.now();
        const recover=initial||sawEvents||now-lastRecovery>=recoveryMs;
        if(recover){lastRecovery=now;await callback.current()}
      }catch{
        consecutiveFailures+=1;
        retryAt=Date.now()+liveChallengeRetryDelay(pollMs,consecutiveFailures);
        // Existing authoritative UI remains visible. The interval keeps ticking,
        // but retryAt suppresses tight retries until the bounded backoff expires.
      }finally{busy=false}
    };

    void tick(true);
    const timer=window.setInterval(()=>void tick(),pollMs);
    return()=>{cancelled=true;window.clearInterval(timer)};
  },[challengeId,pollMs,recoveryMs]);
}
