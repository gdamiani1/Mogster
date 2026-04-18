import dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "./routes/auth";
import { auraRoutes } from "./routes/aura";
import { leaderboardRoutes } from "./routes/leaderboard";
import { friendRoutes } from "./routes/friends";
import { dailyRoutes } from "./routes/daily";
import { battleRoutes } from "./routes/battles";
import { pushRoutes } from "./routes/push";
import { cronRoutes } from "./routes/cron";

const app = Fastify({
  logger: true,
  bodyLimit: 11 * 1024 * 1024, // 11MB — slightly above our 10MB file limit
});

// CORS: only allow our app domains + local dev
const ALLOWED_ORIGINS = [
  "https://mogster.app",
  "https://www.mogster.app",
  // Expo dev
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
  /^http:\/\/172\.\d+\.\d+\.\d+(:\d+)?$/,
  /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
];

app.register(cors, {
  origin: (origin, cb) => {
    // No origin = mobile app (React Native). Allow.
    if (!origin) return cb(null, true);
    const allowed = ALLOWED_ORIGINS.some((o) =>
      typeof o === "string" ? o === origin : o.test(origin)
    );
    cb(null, allowed);
  },
  credentials: true,
});

app.get("/health", async () => ({ status: "cooking", aura: "immaculate" }));

app.register(authRoutes);
app.register(auraRoutes);
app.register(leaderboardRoutes);
app.register(friendRoutes);
app.register(dailyRoutes);
app.register(battleRoutes);
app.register(pushRoutes);
app.register(cronRoutes);

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3000, host: "0.0.0.0" });
    console.log("Mogster API is live fr fr");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
