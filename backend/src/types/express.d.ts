import type { Actor } from '../lib/actor.js';

declare global {
  namespace Express {
    interface Request {
      actor?: Actor;
    }
  }
}

export {};
