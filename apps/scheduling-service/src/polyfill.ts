import * as crypto from 'crypto';

// Polyfill para crypto global (necessário no Node 18 Alpine com TypeORM)
if (typeof (global as any).crypto === 'undefined') {
  (global as any).crypto = crypto.webcrypto;
}
