// A triple-slash reference, not an import: `express.d.ts` is an ambient
// declaration that emits no JavaScript, so importing it would resolve at
// type-check time and then fail at runtime on Vercel.
/// <reference path="../backend/src/types/express.d.ts" />
import { app } from '../backend/src/app.js';

export default app;
