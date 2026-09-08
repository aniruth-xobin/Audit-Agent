import { Queue } from "bullmq";
import Redis from "ioredis";

// Pre-constructed ioredis client — required in ESM environments with BullMQ.
// To migrate to Redis Cloud: just change REDIS_URL in .env.local. No other changes needed.
const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,    // Required for Upstash compatibility
});

export const evaluationQueue = new Queue("groq-evaluation", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, // 5s → 10s → 20s on retry
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});