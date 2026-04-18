import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Vercel Cron authenticates via a Bearer header with CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const fastifyUrl = process.env.FASTIFY_URL;
  const fastifySecret = process.env.FASTIFY_CRON_SECRET;
  if (!fastifyUrl || !fastifySecret) {
    return new NextResponse("Missing FASTIFY_URL or FASTIFY_CRON_SECRET", { status: 500 });
  }

  const res = await fetch(`${fastifyUrl}/cron/daily-challenge-announce`, {
    method: "POST",
    headers: {
      "x-cron-secret": fastifySecret,
      "Content-Type": "application/json",
    },
  });

  const text = await res.text();
  return new NextResponse(text, { status: res.status });
}
