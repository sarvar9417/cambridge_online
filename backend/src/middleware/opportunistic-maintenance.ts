import type{NextFunction,Request,Response}from'express';

/**
 * Runs a housekeeping job at most once per interval, on the back of whichever
 * request happens to arrive first.
 *
 * The request does not wait for it. Nothing in the response depends on the
 * result, so awaiting only means that when the database is slow or unreachable
 * one unlucky user every thirty seconds pays the full connection timeout for
 * work that was never theirs. It is fired, its failure is logged, and the
 * request proceeds.
 *
 * `running` still guards against a second request starting the same job while
 * the first is in flight.
 */
export function opportunisticMaintenance(closeExpired:()=>Promise<unknown>,intervalMs=30_000){
  let nextAt=0,running:Promise<unknown>|null=null;
  return (_req:Request,_res:Response,next:NextFunction)=>{
    const now=Date.now();
    if(now>=nextAt&&!running){
      nextAt=now+intervalMs;
      try{
        // Started synchronously so the work begins now rather than a tick later,
        // then handed to the microtask queue so the request does not wait.
        running=Promise.resolve(closeExpired())
          .catch(error=>console.error('Expired-attempt maintenance failed',error))
          .finally(()=>{running=null});
      }catch(error){
        // A job that throws before returning a promise must not reach the
        // request either.
        console.error('Expired-attempt maintenance failed',error);
        running=null;
      }
    }
    next();
  };
}
