import { FastifyInstance } from "fastify";
import { getTodayChallenge } from "../lib/daily";

export async function dailyRoutes(app: FastifyInstance) {
  app.get("/daily/today", async () => {
    const challenge = getTodayChallenge();
    const today = new Date().toISOString().split("T")[0];
    return { ...challenge, challenge_date: today };
  });
}
