/**
 * DI tokens shared across worker modules.
 *
 * These live in their own file, not `worker.module.ts`, because `IngestionModule`
 * decorates its constructor with them while `WorkerModule` imports `IngestionModule`.
 * Co-locating the symbols with the module created a circular import whose ESM
 * evaluation order makes `@Inject(REDIS)` hit the token before it is initialized
 * (a TDZ `ReferenceError`).
 */
export const DATABASE = Symbol('CAMPATH_WORKER_DATABASE');
export const REDIS = Symbol('CAMPATH_WORKER_REDIS');