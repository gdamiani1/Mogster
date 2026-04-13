import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import { authRoutes } from "./routes/auth";
import { auraRoutes } from "./routes/aura";
import { leaderboardRoutes } from "./routes/leaderboard";
import { friendRoutes } from "./routes/friends";
import { dailyRoutes } from "./routes/daily";

dotenv.config();

const app = Fastify({ logger: true });

app.register(cors, { origin: true });

app.get("/health", async () => ({ status: "cooking", aura: "immaculate" }));

app.register(authRoutes);
app.register(auraRoutes);
app.register(leaderboardRoutes);
app.register(friendRoutes);
app.register(dailyRoutes);

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3000, host: "0.0.0.0" });
    console.log("Aurate API is live fr fr");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
