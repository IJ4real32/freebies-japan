import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({
  region: "asia-northeast1",
  memory: "256MiB",
  concurrency: 80,
  timeoutSeconds: 60,
});

// Only re-exports here — no direct onRequest/logger imports.
