import cors from "cors";
import * as logger from "firebase-functions/logger";
import { getAppConfig } from "./index";

const { origins } = getAppConfig();

// Custom CORS middleware — ONLY for HTTP functions (not needed for Callable functions)
export const corsHandler = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origins.includes(origin)) return callback(null, true);
    logger.warn("Blocked CORS origin", { origin });
    return callback(null, false);
  },
  credentials: true,
});