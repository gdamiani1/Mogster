# Aura Battles Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a friend-vs-friend Aura Battle feature where both users submit camera-only photos, the AI picks a winner via existing /aura/check + a third text-only Gemini narrative call, and an anime-style reveal screen dramatizes the result with boxer W/L records.

**Architecture:** Reuse existing `/aura/check` pipeline for individual photo scoring. Add a new `battles` table and `/battles/*` API surface. Add one new cheap Gemini text-only helper for comparative fight narrative. Add a new bottom tab (Battles) containing both friend management and battle flows. Reveal screen uses react-native-reanimated for 5-phase cinematic animation.

**Tech Stack:** Supabase (Postgres + Storage + Auth), Fastify (Node.js), Gemini 2.5 Flash (text-only call for narrative), React Native + Expo Router, react-native-reanimated, expo-camera, expo-haptics, @upstash/redis (existing).

**Related design doc:** `docs/plans/2026-04-14-aura-battles-design.md`

---

## Phase 1 — Database

### Task 1: Create battles table + profile columns via migration

**Files:**
- Apply migration via Supabase MCP (name: `add_battles`)

**Step 1: Apply the migration**

Use the Supabase MCP tool `apply_migration` with project_id `zyjndqfhueqxcbmtmdfc`, name `add_battles`, and this SQL:

```sql
CREATE TABLE public.battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sigma_path TEXT NOT NULL,

  challenger_check_id UUID REFERENCES public.aura_checks(id) ON DELETE SET NULL,
  opponent_check_id UUID REFERENCES public.aura_checks(id) ON DELETE SET NULL,

  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  margin TEXT CHECK (margin IN ('UD','SD','TKO','DRAW','FORFEIT')),
  narrative JSONB,

  status TEXT NOT NULL DEFAULT 'awaiting_opponent' CHECK (status IN (
    'awaiting_opponent', 'completed', 'expired', 'cancelled'
  )),

  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT battles_challenger_not_opponent CHECK (challenger_id <> opponent_id)
);

CREATE INDEX idx_battles_challenger ON public.battles(challenger_id, created_at DESC);
CREATE INDEX idx_battles_opponent ON public.battles(opponent_id, created_at DESC);
CREATE INDEX idx_battles_active ON public.battles(opponent_id, status)
  WHERE status = 'awaiting_opponent';

ALTER TABLE public.profiles
  ADD COLUMN battle_wins INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN battle_losses INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN battle_draws INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN battle_streak INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Battles visible to participants"
  ON public.battles FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
```

**Step 2: Verify tables and columns exist**

Run via Supabase MCP `execute_sql`:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name LIKE 'battle%'
ORDER BY column_name;
```

Expected: `battle_draws`, `battle_losses`, `battle_streak`, `battle_wins`.

**Step 3: Commit the SQL file to source control**

Create `supabase/migrations/002_add_battles.sql` with the same SQL above (for history).

```bash
git add supabase/migrations/002_add_battles.sql
git commit -m "feat(db): add battles table and profile W-L-D columns"
```

---

## Phase 2 — Server AI helper

### Task 2: Write unit test for `generateFightNarrative` shape

**Files:**
- Create: `server/src/ai/battle.ts` (will be written in next task)
- Create: `server/src/ai/__tests__/battle.test.ts`

**Step 1: Install vitest if missing**

```bash
cd server
npm pkg get scripts.test 2>/dev/null | grep -q vitest || npm install -D vitest
npm pkg set scripts.test="vitest run"
```

**Step 2: Write the failing test**

`server/src/ai/__tests__/battle.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                rounds: [
                  "Round 1: gdamiani steps up, Outfit 82 is cooking no cap",
                  "Round 2: maya fires back with 91 Charm fr",
                  "Round 3: gdamiani lands the finishing blow, 847 vs 712",
                ],
                final_line: "gdamiani is HIM. maya crashed out.",
              }),
          },
        }),
      }),
    })),
  };
});

import { generateFightNarrative } from "../battle";

describe("generateFightNarrative", () => {
  it("returns rounds array and final_line", async () => {
    process.env.GEMINI_API_KEY = "test";
    const result = await generateFightNarrative({
      challenger: { username: "gdamiani", score: 847, stats: [{ label: "Outfit", score: 82 }], roast: "cooking" },
      opponent:   { username: "maya",     score: 712, stats: [{ label: "Charm",  score: 91 }], roast: "trying" },
      sigmaPath: "auramaxxing",
      winnerId: "u1",
      margin: "UD",
    });
    expect(Array.isArray(result.rounds)).toBe(true);
    expect(result.rounds.length).toBeGreaterThanOrEqual(3);
    expect(typeof result.final_line).toBe("string");
    expect(result.final_line.length).toBeGreaterThan(0);
  });
});
```

**Step 3: Run test → expect failure (file missing)**

```bash
cd server && npm test -- battle
```
Expected: `Cannot find module '../battle'`.

**Step 4: Commit failing test**

```bash
git add server/src/ai/__tests__/battle.test.ts server/package.json
git commit -m "test(server): add failing test for generateFightNarrative"
```

---

### Task 3: Implement `generateFightNarrative`

**Files:**
- Create: `server/src/ai/battle.ts`

**Step 1: Implement the helper**

`server/src/ai/battle.ts`:

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface FighterSummary {
  username: string;
  score: number;
  stats: { label: string; score: number }[];
  roast: string;
}

export interface FightNarrativeInput {
  challenger: FighterSummary;
  opponent: FighterSummary;
  sigmaPath: string;
  winnerId: string;
  margin: "UD" | "SD" | "TKO" | "DRAW" | "FORFEIT";
}

export interface FightNarrative {
  rounds: string[];
  final_line: string;
}

const SYSTEM_PROMPT = `You are an anime boxing commentator crossed with a terminally online gen alpha brainrot TikToker.
Write a 3-4 round fight narrative between two "aura battlers" in dramatic round-by-round style.
Reference the actual stats, scores, and names provided. Use gen z brainrot language heavily:
no cap, fr fr, ngl, cooked, mogging, mog differential, ohio energy, W, L, sigma, HIM, NPC, skibidi.
Do NOT be mean about appearance, body, or identity. Roast the VIBE only.
End with a devastating final one-liner about the winner.
Return ONLY valid JSON with this shape:
{"rounds": ["Round 1: ...","Round 2: ...","Round 3: ..."], "final_line": "..."}
No markdown fences, no commentary.`;

function topStats(stats: { label: string; score: number }[]): string {
  return stats
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => `${s.label} ${s.score}`)
    .join(", ");
}

export async function generateFightNarrative(
  input: FightNarrativeInput
): Promise<FightNarrative> {
  const { challenger, opponent, sigmaPath, margin, winnerId } = input;
  const winnerName =
    winnerId === "draw"
      ? "nobody (draw)"
      : winnerId === challenger.username || winnerId.endsWith(challenger.username)
      ? challenger.username
      : opponent.username;

  const userPrompt = `Path: ${sigmaPath}
Margin: ${margin}
Winner: ${winnerName}

CHALLENGER @${challenger.username}
  Score: ${challenger.score}
  Top stats: ${topStats(challenger.stats)}
  Roast: "${challenger.roast}"

OPPONENT @${opponent.username}
  Score: ${opponent.score}
  Top stats: ${topStats(opponent.stats)}
  Roast: "${opponent.roast}"

Write the fight narrative now.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 1.1,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      // @ts-ignore
      thinkingConfig: { thinkingBudget: 0 },
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(userPrompt);
  const raw = result.response.text();
  if (!raw) throw new Error("Gemini returned empty narrative — ringside judges confused fr");

  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);

  const parsed = JSON.parse(cleaned.trim());

  // Defensive validation
  if (!Array.isArray(parsed.rounds) || parsed.rounds.length < 2) {
    throw new Error("Narrative JSON malformed — rounds missing");
  }
  parsed.rounds = parsed.rounds.slice(0, 5).map((r: any) => String(r));
  parsed.final_line = String(parsed.final_line || `${winnerName} took the W.`);

  return parsed as FightNarrative;
}

export function fallbackNarrative(
  challenger: FighterSummary,
  opponent: FighterSummary,
  winnerUsername: string,
  margin: string
): FightNarrative {
  return {
    rounds: [
      `Round 1: @${challenger.username} steps in with ${challenger.score} aura. The fit is talking.`,
      `Round 2: @${opponent.username} fires back at ${opponent.score}. Mog differential is calculating...`,
      `Round 3: ${margin} lands — @${winnerUsername} takes it.`,
    ],
    final_line: `@${winnerUsername} is HIM. No cap.`,
  };
}
```

**Step 2: Run the test**

```bash
cd server && npm test -- battle
```
Expected: PASS.

**Step 3: Commit**

```bash
git add server/src/ai/battle.ts
git commit -m "feat(server): add generateFightNarrative Gemini helper"
```

---

## Phase 3 — Server battle routes

### Task 4: Battle helpers (winner selection, margin, cooldown check)

**Files:**
- Create: `server/src/battles/helpers.ts`
- Create: `server/src/battles/__tests__/helpers.test.ts`

**Step 1: Write failing tests**

`server/src/battles/__tests__/helpers.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { pickWinner, classifyMargin } from "../helpers";

describe("pickWinner", () => {
  it("higher score wins", () => {
    const result = pickWinner(
      { userId: "a", score: 800, stats: [{ label: "x", score: 80 }] },
      { userId: "b", score: 600, stats: [{ label: "x", score: 60 }] }
    );
    expect(result.winnerId).toBe("a");
  });

  it("tie broken by max single stat", () => {
    const result = pickWinner(
      { userId: "a", score: 700, stats: [{ label: "x", score: 80 }] },
      { userId: "b", score: 700, stats: [{ label: "x", score: 95 }] }
    );
    expect(result.winnerId).toBe("b");
  });

  it("returns draw when score AND max stat equal", () => {
    const result = pickWinner(
      { userId: "a", score: 700, stats: [{ label: "x", score: 80 }] },
      { userId: "b", score: 700, stats: [{ label: "x", score: 80 }] }
    );
    expect(result.winnerId).toBe("draw");
  });
});

describe("classifyMargin", () => {
  it("TKO when difference > 200", () => {
    expect(classifyMargin(900, 650)).toBe("TKO");
  });
  it("UD when difference 51-200", () => {
    expect(classifyMargin(800, 700)).toBe("UD");
  });
  it("SD when difference 1-50", () => {
    expect(classifyMargin(800, 770)).toBe("SD");
  });
  it("DRAW when equal", () => {
    expect(classifyMargin(800, 800)).toBe("DRAW");
  });
});
```

**Step 2: Run → expect failure**

```bash
cd server && npm test -- helpers
```
Expected: `Cannot find module '../helpers'`.

**Step 3: Implement helpers**

`server/src/battles/helpers.ts`:

```typescript
export interface FighterInput {
  userId: string;
  score: number;
  stats: { label: string; score: number }[];
}

export interface WinnerResult {
  winnerId: string | "draw";
  loserId: string | null;
}

export function maxStat(stats: { label: string; score: number }[]): number {
  if (!stats.length) return 0;
  return Math.max(...stats.map((s) => s.score));
}

export function pickWinner(a: FighterInput, b: FighterInput): WinnerResult {
  if (a.score > b.score) return { winnerId: a.userId, loserId: b.userId };
  if (b.score > a.score) return { winnerId: b.userId, loserId: a.userId };
  // tiebreak: higher single stat
  const aMax = maxStat(a.stats);
  const bMax = maxStat(b.stats);
  if (aMax > bMax) return { winnerId: a.userId, loserId: b.userId };
  if (bMax > aMax) return { winnerId: b.userId, loserId: a.userId };
  return { winnerId: "draw", loserId: null };
}

export type BattleMargin = "TKO" | "UD" | "SD" | "DRAW" | "FORFEIT";

export function classifyMargin(winnerScore: number, loserScore: number): BattleMargin {
  const diff = Math.abs(winnerScore - loserScore);
  if (diff === 0) return "DRAW";
  if (diff > 200) return "TKO";
  if (diff > 50) return "UD";
  return "SD";
}
```

**Step 4: Run tests → expect all pass**

```bash
cd server && npm test -- helpers
```
Expected: 4 PASS.

**Step 5: Commit**

```bash
git add server/src/battles/
git commit -m "feat(server): add battle winner + margin helpers"
```

---

### Task 5: `POST /battles/create` route

**Files:**
- Create: `server/src/routes/battles.ts`
- Modify: `server/src/index.ts`

**Step 1: Register route in index**

Read `server/src/index.ts`. Add import near other route imports:

```typescript
import { battleRoutes } from "./routes/battles";
```

And after `app.register(dailyRoutes);`:

```typescript
app.register(battleRoutes);
```

**Step 2: Create the route file**

`server/src/routes/battles.ts`:

```typescript
import { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { supabase } from "../lib/supabase";
import { rateAura } from "../ai/rate";
import { generateFightNarrative, fallbackNarrative, FighterSummary } from "../ai/battle";
import { pickWinner, classifyMargin, BattleMargin } from "../battles/helpers";
import { SigmaPath, SIGMA_PATHS } from "../ai/types";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function isCameraSource(request: AuthedRequest): boolean {
  return (request.headers["x-source"] as string | undefined) === "camera";
}

async function uploadBattlePhoto(
  userId: string,
  buffer: Buffer,
  mimetype: string
): Promise<string> {
  const fileName = `${userId}/battle-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from("aura-pics")
    .upload(fileName, buffer, { contentType: mimetype });
  if (error) throw new Error("Upload failed");
  const { data } = supabase.storage.from("aura-pics").getPublicUrl(fileName);
  return data.publicUrl;
}

export async function battleRoutes(app: FastifyInstance) {
  app.register(multipart, { limits: { fileSize: 10_000_000 } });

  // ─── Create battle ───
  app.post("/battles/create", { preHandler: requireAuth }, async (request: AuthedRequest, reply) => {
    if (!isCameraSource(request)) {
      return reply.status(400).send({ error: "Battles require camera only bro" });
    }

    const challengerId = request.userId!;
    const opponentUsername = request.headers["x-opponent-username"] as string;
    const sigmaPath = request.headers["x-sigma-path"] as SigmaPath;

    if (!opponentUsername) return reply.status(400).send({ error: "Missing opponent username" });
    if (!SIGMA_PATHS[sigmaPath]) return reply.status(400).send({ error: "Invalid sigma path" });

    // Look up opponent
    const { data: opponent } = await supabase
      .from("profiles").select("id, username").eq("username", opponentUsername).single();
    if (!opponent) return reply.status(404).send({ error: "Opponent not found" });
    if (opponent.id === challengerId) return reply.status(400).send({ error: "Can't battle yourself" });

    // Must be accepted friends
    const { data: friendship } = await supabase
      .from("friendships").select("id")
      .or(`and(requester_id.eq.${challengerId},addressee_id.eq.${opponent.id}),and(requester_id.eq.${opponent.id},addressee_id.eq.${challengerId})`)
      .eq("status", "accepted")
      .maybeSingle();
    if (!friendship) return reply.status(403).send({ error: "Only friends can battle" });

    // No existing pending battle between pair
    const { data: pending } = await supabase
      .from("battles").select("id")
      .or(`and(challenger_id.eq.${challengerId},opponent_id.eq.${opponent.id}),and(challenger_id.eq.${opponent.id},opponent_id.eq.${challengerId})`)
      .eq("status", "awaiting_opponent")
      .maybeSingle();
    if (pending) return reply.status(409).send({ error: "You already have a pending battle with this user" });

    // 24h loss cooldown check
    const cooldownCutoff = new Date(Date.now() - ONE_DAY_MS).toISOString();
    const { data: recentLoss } = await supabase
      .from("battles").select("id")
      .eq("winner_id", opponent.id)
      .or(`challenger_id.eq.${challengerId},opponent_id.eq.${challengerId}`)
      .gt("completed_at", cooldownCutoff)
      .maybeSingle();
    if (recentLoss) return reply.status(429).send({ error: "You can't rematch for 24h after a loss bro" });

    // Read photo
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: "No pic detected" });
    if (!["image/jpeg", "image/png"].includes(data.mimetype)) {
      return reply.status(400).send({ error: "JPEG or PNG only" });
    }
    const buffer = await data.toBuffer();

    // Upload photo
    const imageUrl = await uploadBattlePhoto(challengerId, buffer, data.mimetype);

    // Rate challenger photo (reuses existing AI pipeline)
    const result = await rateAura(buffer.toString("base64"), sigmaPath);

    // Insert aura_check row for challenger
    const { data: check, error: checkErr } = await supabase
      .from("aura_checks")
      .insert({
        user_id: challengerId,
        image_url: imageUrl,
        sigma_path: sigmaPath,
        aura_score: result.aura_score,
        personality_read: result.personality_read,
        roast: result.roast,
        aura_color: result.aura_color,
        tier: result.tier,
        stats: result.stats,
      }).select().single();
    if (checkErr) return reply.status(500).send({ error: "DB insert failed" });

    // Insert battle row
    const expiresAt = new Date(Date.now() + ONE_DAY_MS).toISOString();
    const { data: battle, error: battleErr } = await supabase
      .from("battles")
      .insert({
        challenger_id: challengerId,
        opponent_id: opponent.id,
        sigma_path: sigmaPath,
        challenger_check_id: check.id,
        expires_at: expiresAt,
      }).select().single();
    if (battleErr) return reply.status(500).send({ error: "Battle create failed" });

    return { battle_id: battle.id, expires_at: expiresAt };
  });
}
```

**Step 3: Build the server to verify it compiles**

```bash
cd server && npm run build
```
Expected: clean TypeScript build, no errors.

**Step 4: Commit**

```bash
git add server/src/routes/battles.ts server/src/index.ts
git commit -m "feat(server): POST /battles/create endpoint"
```

---

### Task 6: `POST /battles/:id/accept` route

**Files:**
- Modify: `server/src/routes/battles.ts`

**Step 1: Append accept handler**

At the end of `battleRoutes` in `server/src/routes/battles.ts`, add:

```typescript
  // ─── Accept battle (opponent submits photo) ───
  app.post("/battles/:battleId/accept", { preHandler: requireAuth }, async (request: AuthedRequest, reply) => {
    if (!isCameraSource(request)) {
      return reply.status(400).send({ error: "Battles require camera only bro" });
    }

    const { battleId } = request.params as { battleId: string };
    const opponentId = request.userId!;

    // Load battle + verify
    const { data: battle } = await supabase
      .from("battles").select("*").eq("id", battleId).single();
    if (!battle) return reply.status(404).send({ error: "Battle not found" });
    if (battle.opponent_id !== opponentId) return reply.status(403).send({ error: "Not your battle to accept" });
    if (battle.status !== "awaiting_opponent") return reply.status(409).send({ error: "Battle already resolved" });
    if (new Date(battle.expires_at).getTime() < Date.now()) {
      // Auto-mark expired
      await supabase.from("battles").update({ status: "expired" }).eq("id", battleId);
      return reply.status(410).send({ error: "Battle expired" });
    }

    // Read opponent photo
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: "No pic detected" });
    if (!["image/jpeg", "image/png"].includes(data.mimetype)) {
      return reply.status(400).send({ error: "JPEG or PNG only" });
    }
    const buffer = await data.toBuffer();

    // Upload + rate
    const imageUrl = await uploadBattlePhoto(opponentId, buffer, data.mimetype);
    const result = await rateAura(buffer.toString("base64"), battle.sigma_path as SigmaPath);

    // Insert opponent aura_check
    const { data: oppCheck, error: oppCheckErr } = await supabase
      .from("aura_checks").insert({
        user_id: opponentId,
        image_url: imageUrl,
        sigma_path: battle.sigma_path,
        aura_score: result.aura_score,
        personality_read: result.personality_read,
        roast: result.roast,
        aura_color: result.aura_color,
        tier: result.tier,
        stats: result.stats,
      }).select().single();
    if (oppCheckErr) return reply.status(500).send({ error: "DB insert failed" });

    // Load challenger check (need score + stats for winner calc)
    const { data: challengerCheck } = await supabase
      .from("aura_checks").select("*").eq("id", battle.challenger_check_id).single();
    if (!challengerCheck) return reply.status(500).send({ error: "Challenger check missing" });

    // Determine winner
    const winnerResult = pickWinner(
      { userId: battle.challenger_id, score: challengerCheck.aura_score, stats: challengerCheck.stats || [] },
      { userId: opponentId, score: oppCheck.aura_score, stats: oppCheck.stats || [] }
    );

    let margin: BattleMargin = "DRAW";
    if (winnerResult.winnerId !== "draw") {
      const winnerScore = winnerResult.winnerId === battle.challenger_id ? challengerCheck.aura_score : oppCheck.aura_score;
      const loserScore = winnerResult.winnerId === battle.challenger_id ? oppCheck.aura_score : challengerCheck.aura_score;
      margin = classifyMargin(winnerScore, loserScore);
    }

    // Usernames for narrative
    const { data: profiles } = await supabase
      .from("profiles").select("id, username")
      .in("id", [battle.challenger_id, opponentId]);
    const challengerProfile = profiles?.find((p) => p.id === battle.challenger_id);
    const opponentProfile = profiles?.find((p) => p.id === opponentId);

    const challengerSummary: FighterSummary = {
      username: challengerProfile?.username || "challenger",
      score: challengerCheck.aura_score,
      stats: challengerCheck.stats || [],
      roast: challengerCheck.roast,
    };
    const opponentSummary: FighterSummary = {
      username: opponentProfile?.username || "opponent",
      score: oppCheck.aura_score,
      stats: oppCheck.stats || [],
      roast: oppCheck.roast,
    };

    const winnerUsername =
      winnerResult.winnerId === "draw"
        ? "draw"
        : winnerResult.winnerId === battle.challenger_id
        ? challengerSummary.username
        : opponentSummary.username;

    // Generate narrative (with fallback if Gemini fails)
    let narrative;
    try {
      narrative = await generateFightNarrative({
        challenger: challengerSummary,
        opponent: opponentSummary,
        sigmaPath: battle.sigma_path,
        winnerId: winnerUsername,
        margin,
      });
    } catch (err) {
      app.log.error({ err }, "Narrative generation failed, using fallback");
      narrative = fallbackNarrative(challengerSummary, opponentSummary, winnerUsername, margin);
    }

    // Update battle row
    await supabase.from("battles").update({
      opponent_check_id: oppCheck.id,
      winner_id: winnerResult.winnerId === "draw" ? null : winnerResult.winnerId,
      margin,
      narrative,
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", battle.id);

    // Update both profiles' records
    if (winnerResult.winnerId === "draw") {
      // Draw: both +1 draw, streak reset to 0
      await supabase.rpc("increment_profile_draw", { p_user_id: battle.challenger_id }).then(() => {}).catch(() => {});
      await supabase.rpc("increment_profile_draw", { p_user_id: opponentId }).then(() => {}).catch(() => {});
      // Fallback if RPC doesn't exist yet: raw UPDATE
      await supabase.from("profiles").update({ battle_draws: (challengerProfile as any).battle_draws + 1, battle_streak: 0 })
        .eq("id", battle.challenger_id);
      await supabase.from("profiles").update({ battle_draws: (opponentProfile as any).battle_draws + 1, battle_streak: 0 })
        .eq("id", opponentId);
    } else {
      const winnerId = winnerResult.winnerId;
      const loserId = winnerResult.loserId!;
      // Load both full profiles for stats
      const { data: fullProfiles } = await supabase
        .from("profiles").select("id, battle_wins, battle_losses, battle_streak")
        .in("id", [winnerId, loserId]);
      const winnerProfile = fullProfiles?.find((p) => p.id === winnerId);
      const loserProfile = fullProfiles?.find((p) => p.id === loserId);
      if (winnerProfile) {
        await supabase.from("profiles").update({
          battle_wins: winnerProfile.battle_wins + 1,
          battle_streak: winnerProfile.battle_streak >= 0 ? winnerProfile.battle_streak + 1 : 1,
        }).eq("id", winnerId);
      }
      if (loserProfile) {
        await supabase.from("profiles").update({
          battle_losses: loserProfile.battle_losses + 1,
          battle_streak: loserProfile.battle_streak <= 0 ? loserProfile.battle_streak - 1 : -1,
        }).eq("id", loserId);
      }
    }

    return {
      battle_id: battle.id,
      winner_id: winnerResult.winnerId,
      margin,
      narrative,
      challenger_check: challengerCheck,
      opponent_check: oppCheck,
    };
  });
```

**Step 2: Build server to verify**

```bash
cd server && npm run build
```
Expected: clean.

**Step 3: Commit**

```bash
git add server/src/routes/battles.ts
git commit -m "feat(server): POST /battles/:id/accept with winner selection + narrative"
```

---

### Task 7: `GET /battles/active`, `GET /battles/history`, `GET /battles/:id`, `POST /battles/:id/decline`

**Files:**
- Modify: `server/src/routes/battles.ts`

**Step 1: Append read + decline handlers**

Append to `battleRoutes`:

```typescript
  // ─── Active battles for current user ───
  app.get("/battles/active", { preHandler: requireAuth }, async (request: AuthedRequest) => {
    const userId = request.userId!;

    // Auto-expire stale battles first (cheap side-effect)
    await supabase
      .from("battles")
      .update({ status: "expired" })
      .eq("status", "awaiting_opponent")
      .lt("expires_at", new Date().toISOString());

    const { data } = await supabase
      .from("battles")
      .select(`
        id, challenger_id, opponent_id, sigma_path, expires_at, created_at,
        challenger:profiles!battles_challenger_id_fkey(id, username, battle_wins, battle_losses),
        opponent:profiles!battles_opponent_id_fkey(id, username, battle_wins, battle_losses)
      `)
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .eq("status", "awaiting_opponent")
      .order("created_at", { ascending: false });

    return { battles: data || [] };
  });

  // ─── Battle history ───
  app.get("/battles/history", { preHandler: requireAuth }, async (request: AuthedRequest) => {
    const userId = request.userId!;
    const { data } = await supabase
      .from("battles")
      .select(`
        id, challenger_id, opponent_id, winner_id, margin, sigma_path,
        narrative, completed_at,
        challenger:profiles!battles_challenger_id_fkey(id, username),
        opponent:profiles!battles_opponent_id_fkey(id, username)
      `)
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(50);
    return { battles: data || [] };
  });

  // ─── Battle detail ───
  app.get("/battles/:battleId", { preHandler: requireAuth }, async (request: AuthedRequest, reply) => {
    const { battleId } = request.params as { battleId: string };
    const userId = request.userId!;
    const { data: battle } = await supabase
      .from("battles")
      .select(`
        *,
        challenger:profiles!battles_challenger_id_fkey(id, username, battle_wins, battle_losses, battle_streak),
        opponent:profiles!battles_opponent_id_fkey(id, username, battle_wins, battle_losses, battle_streak),
        challenger_check:aura_checks!battles_challenger_check_id_fkey(*),
        opponent_check:aura_checks!battles_opponent_check_id_fkey(*)
      `)
      .eq("id", battleId)
      .single();
    if (!battle) return reply.status(404).send({ error: "Battle not found" });
    if (battle.challenger_id !== userId && battle.opponent_id !== userId) {
      return reply.status(403).send({ error: "Not your battle to view" });
    }
    return { battle };
  });

  // ─── Decline ───
  app.post("/battles/:battleId/decline", { preHandler: requireAuth }, async (request: AuthedRequest, reply) => {
    const { battleId } = request.params as { battleId: string };
    const userId = request.userId!;
    const { data: battle } = await supabase.from("battles").select("opponent_id, status").eq("id", battleId).single();
    if (!battle) return reply.status(404).send({ error: "Not found" });
    if (battle.opponent_id !== userId) return reply.status(403).send({ error: "Not your battle" });
    if (battle.status !== "awaiting_opponent") return reply.status(409).send({ error: "Already resolved" });
    await supabase.from("battles").update({ status: "cancelled" }).eq("id", battleId);
    return { ok: true };
  });
```

**Step 2: Build**

```bash
cd server && npm run build
```
Expected: clean.

**Step 3: Deploy server to Fly**

```bash
cd server && flyctl deploy --remote-only
```
Expected: `Deployed mogster-api`.

**Step 4: Smoke test the production endpoint**

```bash
curl -s https://mogster-api.fly.dev/battles/active -H "Authorization: Bearer $TEST_TOKEN"
```
Expected: `{"battles":[]}` (empty unless you have pending).

**Step 5: Commit**

```bash
git add server/src/routes/battles.ts
git commit -m "feat(server): battle list, history, detail, decline endpoints"
```

---

## Phase 4 — Mobile: navigation + Battles tab

### Task 8: Add Battles tab, replace Circle tab structure

**Files:**
- Modify: `app/app/(tabs)/_layout.tsx`
- Rename: `app/app/(tabs)/circle.tsx` → `app/app/(tabs)/battles.tsx`

**Step 1: Rename file**

```bash
cd app && git mv app/\(tabs\)/circle.tsx app/\(tabs\)/battles.tsx
```

**Step 2: Update tab layout**

Open `app/app/(tabs)/_layout.tsx`, locate the Circle tab screen, replace with:

```tsx
<Tabs.Screen
  name="battles"
  options={{
    title: "Battles",
    tabBarIcon: ({ color }) => <FontAwesome size={24} name="trophy" color={color} />,
  }}
/>
```

Remove the `circle` screen registration (if explicit). The router auto-picks up the file name.

**Step 3: Add segmented tabs inside battles.tsx**

Replace the top-level content of `battles.tsx` with:

```tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING } from "../../src/constants/theme";
import FriendsSection from "../../src/components/battles/FriendsSection";
import BattlesSection from "../../src/components/battles/BattlesSection";

type Tab = "battles" | "friends";

export default function BattlesScreen() {
  const [tab, setTab] = useState<Tab>("battles");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.segmented}>
        <TouchableOpacity
          style={[styles.segment, tab === "battles" && styles.segmentActive]}
          onPress={() => setTab("battles")}
        >
          <Text style={[styles.segmentText, tab === "battles" && styles.segmentTextActive]}>⚔ Battles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, tab === "friends" && styles.segmentActive]}
          onPress={() => setTab("friends")}
        >
          <Text style={[styles.segmentText, tab === "friends" && styles.segmentTextActive]}>Friends</Text>
        </TouchableOpacity>
      </View>
      {tab === "battles" ? <BattlesSection /> : <FriendsSection />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  segmented: {
    flexDirection: "row",
    gap: SPACING.xs,
    margin: SPACING.md,
    padding: 3,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  segmentActive: { backgroundColor: COLORS.primary },
  segmentText: { color: COLORS.textMuted, fontSize: 14, fontWeight: "700" },
  segmentTextActive: { color: "#fff" },
});
```

**Step 4: Move the old circle content into FriendsSection**

`app/src/components/battles/FriendsSection.tsx`: Create this file. Copy the existing old circle content body (the friends list + pending requests + link up input) into this component, stripped of `SafeAreaView`. Export as default.

**Step 5: Commit**

```bash
git add app/
git commit -m "feat(app): replace Circle tab with Battles tab + Friends subsection"
```

---

### Task 9: Battles tab content (record + active + history)

**Files:**
- Create: `app/src/components/battles/BattlesSection.tsx`
- Create: `app/src/components/battles/RecordCard.tsx`
- Create: `app/src/components/battles/BattleCard.tsx`

**Step 1: RecordCard component**

`app/src/components/battles/RecordCard.tsx`:

```tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";

export default function RecordCard() {
  const { profile } = useAuthStore();
  const wins = (profile as any)?.battle_wins ?? 0;
  const losses = (profile as any)?.battle_losses ?? 0;
  const draws = (profile as any)?.battle_draws ?? 0;
  const streak = (profile as any)?.battle_streak ?? 0;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>YOUR RECORD</Text>
      <View style={styles.row}>
        <Stat label="W" value={wins} color={COLORS.success} />
        <Stat label="L" value={losses} color={COLORS.danger} />
        <Stat label="D" value={draws} color={COLORS.textMuted} />
        <StreakBadge streak={streak} />
      </View>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ alignItems: "center", marginRight: SPACING.lg }}>
      <Text style={[styles.big, { color }]}>{value}</Text>
      <Text style={styles.small}>{label}</Text>
    </View>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;
  const text = streak > 0 ? `🔥 ${streak}W` : `💀 ${Math.abs(streak)}L`;
  return (
    <View style={[styles.streak, streak > 0 ? { backgroundColor: COLORS.warning + "30" } : { backgroundColor: COLORS.danger + "30" }]}>
      <Text style={[styles.streakText, { color: streak > 0 ? COLORS.warning : COLORS.danger }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    marginHorizontal: SPACING.md,
    padding: SPACING.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  label: { color: COLORS.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 2, marginBottom: SPACING.sm },
  row: { flexDirection: "row", alignItems: "center" },
  big: { fontSize: 28, fontWeight: "900" },
  small: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
  streak: {
    marginLeft: "auto",
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 10,
  },
  streakText: { fontSize: 13, fontWeight: "800" },
});
```

**Step 2: BattleCard component**

`app/src/components/battles/BattleCard.tsx`:

```tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../../constants/theme";

interface Props {
  kind: "active-incoming" | "active-outgoing" | "history";
  opponentName: string;
  sigmaPath?: string;
  timeText?: string;
  isWin?: boolean;
  margin?: string;
  onPress: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function BattleCard(props: Props) {
  const { kind, opponentName, sigmaPath, timeText, isWin, margin, onPress, onAccept, onDecline } = props;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {kind === "history" && (
        <View style={[styles.badge, isWin ? styles.winBadge : styles.lossBadge]}>
          <Text style={styles.badgeText}>{isWin ? "W" : "L"}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title}>
          {kind === "active-incoming" && `@${opponentName} challenged you`}
          {kind === "active-outgoing" && `You challenged @${opponentName}`}
          {kind === "history" && `vs @${opponentName} · ${margin}`}
        </Text>
        <Text style={styles.subtitle}>
          {sigmaPath} · {timeText}
        </Text>
      </View>
      {kind === "active-incoming" && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={onAccept} style={[styles.btn, styles.acceptBtn]}>
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDecline} style={[styles.btn, styles.declineBtn]}>
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badge: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    marginRight: SPACING.md,
  },
  winBadge: { backgroundColor: COLORS.success + "30" },
  lossBadge: { backgroundColor: COLORS.danger + "30" },
  badgeText: { fontSize: 16, fontWeight: "900", color: "#fff" },
  info: { flex: 1 },
  title: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "700" },
  subtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: "row", gap: SPACING.xs },
  btn: { paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: 8 },
  acceptBtn: { backgroundColor: COLORS.primary },
  declineBtn: { backgroundColor: COLORS.bgElevated },
  acceptText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  declineText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "800" },
});
```

**Step 3: BattlesSection**

`app/src/components/battles/BattlesSection.tsx`:

```tsx
import React, { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, SPACING } from "../../constants/theme";
import { authedFetch } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import RecordCard from "./RecordCard";
import BattleCard from "./BattleCard";

function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m left`;
}

export default function BattlesSection() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [active, setActive] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, hRes] = await Promise.all([
        authedFetch("/battles/active"),
        authedFetch("/battles/history"),
      ]);
      setActive((await aRes.json()).battles ?? []);
      setHistory((await hRes.json()).battles ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const accept = (battleId: string) => router.push(`/battles/accept/${battleId}` as any);
  const decline = async (battleId: string) => {
    await authedFetch(`/battles/${battleId}/decline`, { method: "POST" });
    fetchAll();
  };

  return (
    <FlatList
      data={[]}
      keyExtractor={() => "empty"}
      renderItem={() => null}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      ListHeaderComponent={
        <View>
          <RecordCard />
          {loading && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.md }} />}

          <Text style={styles.sectionHeader}>⚔ ACTIVE</Text>
          {active.length === 0 ? (
            <Text style={styles.empty}>No active battles. Challenge a friend fr.</Text>
          ) : (
            active.map((b) => {
              const iAmOpponent = b.opponent_id === profile?.id;
              return (
                <BattleCard
                  key={b.id}
                  kind={iAmOpponent ? "active-incoming" : "active-outgoing"}
                  opponentName={iAmOpponent ? b.challenger.username : b.opponent.username}
                  sigmaPath={b.sigma_path}
                  timeText={timeLeft(b.expires_at)}
                  onPress={() => iAmOpponent ? accept(b.id) : router.push(`/battles/reveal/${b.id}` as any)}
                  onAccept={() => accept(b.id)}
                  onDecline={() => decline(b.id)}
                />
              );
            })
          )}

          <Text style={styles.sectionHeader}>HISTORY</Text>
          {history.length === 0 ? (
            <Text style={styles.empty}>No battles yet.</Text>
          ) : (
            history.map((b) => {
              const isWin = b.winner_id === profile?.id;
              const opponent = b.challenger_id === profile?.id ? b.opponent.username : b.challenger.username;
              return (
                <BattleCard
                  key={b.id}
                  kind="history"
                  opponentName={opponent}
                  sigmaPath={b.sigma_path}
                  timeText={new Date(b.completed_at).toLocaleDateString()}
                  isWin={isWin}
                  margin={b.margin}
                  onPress={() => router.push(`/battles/reveal/${b.id}` as any)}
                />
              );
            })
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  empty: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    textAlign: "center",
  },
});
```

**Step 4: Commit**

```bash
git add app/src/components/battles/
git commit -m "feat(app): battles section with record + active + history lists"
```

---

## Phase 5 — Challenge flow screens

### Task 10: Challenge start screen

**Files:**
- Create: `app/app/battles/challenge/[friendId].tsx`

**Step 1: Implement the screen**

```tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { COLORS, SPACING } from "../../../src/constants/theme";
import { SIGMA_PATHS } from "../../../src/constants/paths";
import { authedFetch, API_URL } from "../../../src/lib/api";
import { supabase } from "../../../src/lib/supabase";

export default function ChallengeStartScreen() {
  const router = useRouter();
  const { friendId, friendUsername } = useLocalSearchParams<{ friendId: string; friendUsername: string }>();
  const [path, setPath] = useState(SIGMA_PATHS[0].id);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Camera denied"); return; }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1,1], quality: 0.8 });
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  };

  const submit = async () => {
    if (!photoUri) return;
    setSubmitting(true);
    try {
      const fileName = photoUri.split("/").pop() || "battle.jpg";
      const form = new FormData();
      form.append("file", { uri: photoUri, name: fileName, type: "image/jpeg" } as any);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/battles/create`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "multipart/form-data",
          "x-source": "camera",
          "x-opponent-username": String(friendUsername),
          "x-sigma-path": path,
        },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      Alert.alert("Challenge sent ⚔", "24h on the clock", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert("L", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Challenge @{friendUsername}</Text>

      <Text style={styles.label}>Pick path</Text>
      <View style={styles.pathRow}>
        {SIGMA_PATHS.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.pathPill, path === p.id && styles.pathPillActive]}
            onPress={() => setPath(p.id)}
          >
            <Text style={[styles.pathText, path === p.id && { color: "#fff" }]}>{p.emoji} {p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.preview} />
      ) : (
        <TouchableOpacity style={styles.cameraBtn} onPress={takePhoto}>
          <Text style={styles.cameraBtnText}>📸 Take photo</Text>
        </TouchableOpacity>
      )}

      {photoUri && (
        <View style={{ gap: SPACING.sm }}>
          <TouchableOpacity style={styles.retakeBtn} onPress={takePhoto}>
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Send Challenge</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.lg },
  header: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "900", marginBottom: SPACING.lg },
  label: { color: COLORS.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 2, marginBottom: SPACING.sm },
  pathRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, marginBottom: SPACING.lg },
  pathPill: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: 14, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pathPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pathText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "700" },
  cameraBtn: {
    height: 240, backgroundColor: COLORS.bgCard, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: COLORS.border, borderStyle: "dashed",
    marginBottom: SPACING.lg,
  },
  cameraBtnText: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "800" },
  preview: { height: 320, borderRadius: 18, marginBottom: SPACING.lg },
  retakeBtn: { backgroundColor: COLORS.bgCard, padding: SPACING.md, borderRadius: 12, alignItems: "center" },
  retakeText: { color: COLORS.textMuted, fontWeight: "700" },
  submitBtn: { backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: 12, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});
```

**Step 2: Wire a button from the FriendsSection card**

In `FriendsSection.tsx`, add a "Challenge" button on each friend card that navigates to `/battles/challenge/${friend.id}?friendUsername=${friend.username}`.

**Step 3: Commit**

```bash
git add app/
git commit -m "feat(app): battle challenge start screen with camera-only capture"
```

---

### Task 11: Accept screen

**Files:**
- Create: `app/app/battles/accept/[battleId].tsx`

**Step 1: Implement accept**

```tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { COLORS, SPACING } from "../../../src/constants/theme";
import { authedFetch, API_URL } from "../../../src/lib/api";
import { supabase } from "../../../src/lib/supabase";

export default function AcceptScreen() {
  const { battleId } = useLocalSearchParams<{ battleId: string }>();
  const router = useRouter();
  const [battle, setBattle] = useState<any>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    authedFetch(`/battles/${battleId}`).then((r) => r.json()).then((j) => setBattle(j.battle));
  }, [battleId]);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Camera denied"); return; }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1,1], quality: 0.8 });
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  };

  const submit = async () => {
    if (!photoUri) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("file", { uri: photoUri, name: "battle.jpg", type: "image/jpeg" } as any);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/battles/${battleId}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "multipart/form-data",
          "x-source": "camera",
        },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.replace(`/battles/reveal/${battleId}` as any);
    } catch (e: any) {
      Alert.alert("L", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!battle) return <SafeAreaView style={styles.container}><ActivityIndicator color={COLORS.primary} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>⚔ Challenge</Text>
      <Text style={styles.subtitle}>@{battle.challenger.username} wants to battle</Text>
      <Text style={styles.path}>Path: {battle.sigma_path}</Text>
      <Text style={styles.hint}>They already submitted. Their photo is hidden until you take yours.</Text>

      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.preview} />
      ) : (
        <TouchableOpacity style={styles.cameraBtn} onPress={takePhoto}>
          <Text style={styles.cameraBtnText}>🥊 Take Your Shot</Text>
        </TouchableOpacity>
      )}

      {photoUri && (
        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit</Text>}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.lg },
  header: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "900", marginBottom: SPACING.xs },
  subtitle: { color: COLORS.textSecondary, fontSize: 16, marginBottom: SPACING.xs },
  path: { color: COLORS.primary, fontSize: 12, fontWeight: "800", letterSpacing: 2, marginBottom: SPACING.sm },
  hint: { color: COLORS.textMuted, fontSize: 12, marginBottom: SPACING.lg },
  cameraBtn: {
    height: 280, backgroundColor: COLORS.bgCard, borderRadius: 18,
    alignItems: "center", justifyContent: "center", borderWidth: 2,
    borderColor: COLORS.primary, borderStyle: "dashed", marginBottom: SPACING.lg,
  },
  cameraBtnText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  preview: { height: 320, borderRadius: 18, marginBottom: SPACING.lg },
  submitBtn: { backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: 12, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});
```

**Step 2: Commit**

```bash
git add app/app/battles/accept/
git commit -m "feat(app): battle accept screen with camera-only capture"
```

---

## Phase 6 — Anime reveal screen

### Task 12: Reveal screen — phase 1 + 2 (entrance + fighter intro)

**Files:**
- Create: `app/app/battles/reveal/[battleId].tsx`

**Step 1: Install expo-haptics if missing**

```bash
cd app && npx expo install expo-haptics
```

**Step 2: Scaffold the screen with data fetch + fighter intro**

```tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, withRepeat } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING } from "../../../src/constants/theme";
import { authedFetch } from "../../../src/lib/api";

const { width: W, height: H } = Dimensions.get("window");

export default function RevealScreen() {
  const { battleId } = useLocalSearchParams<{ battleId: string }>();
  const [battle, setBattle] = useState<any>(null);

  const titleOpacity = useSharedValue(0);
  const titleShake = useSharedValue(0);
  const leftX = useSharedValue(-W);
  const rightX = useSharedValue(W);

  useEffect(() => {
    authedFetch(`/battles/${battleId}`).then((r) => r.json()).then((j) => setBattle(j.battle));
  }, [battleId]);

  useEffect(() => {
    if (!battle) return;
    // Phase 1: Entrance
    titleOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(600, withTiming(0.95, { duration: 200 }))
    );
    titleShake.value = withRepeat(withSequence(withTiming(-4, { duration: 60 }), withTiming(4, { duration: 60 })), 6, true);
    // Phase 2: Fighter slide in
    leftX.value = withDelay(1000, withTiming(0, { duration: 600 }));
    rightX.value = withDelay(1000, withTiming(0, { duration: 600 }));
  }, [battle]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateX: titleShake.value }],
  }));
  const leftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: leftX.value }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: rightX.value }] }));

  if (!battle) return <SafeAreaView style={styles.loading}><ActivityIndicator color={COLORS.primary} size="large" /></SafeAreaView>;

  const challenger = battle.challenger;
  const opponent = battle.opponent;
  const challengerCheck = battle.challenger_check;
  const opponentCheck = battle.opponent_check;

  return (
    <View style={styles.container}>
      {/* Phase 1 entrance title */}
      <Animated.View style={[styles.titleWrap, titleStyle]}>
        <Text style={styles.title}>AURA BATTLE</Text>
      </Animated.View>

      {/* Phase 2 fighter cards */}
      <View style={styles.ring}>
        <Animated.View style={[styles.fighter, leftStyle]}>
          <LinearGradient
            colors={[challengerCheck?.aura_color?.primary ?? "#8B5CF6", challengerCheck?.aura_color?.secondary ?? "#EC4899"]}
            style={styles.fighterBorder}
          >
            <Image source={{ uri: challengerCheck?.image_url }} style={styles.fighterImage} />
          </LinearGradient>
          <Text style={styles.fighterLabel}>CHALLENGER</Text>
          <Text style={styles.fighterName}>@{challenger.username}</Text>
          <Text style={styles.fighterRecord}>{challenger.battle_wins}W - {challenger.battle_losses}L</Text>
        </Animated.View>

        <Text style={styles.vs}>VS</Text>

        <Animated.View style={[styles.fighter, rightStyle]}>
          <LinearGradient
            colors={[opponentCheck?.aura_color?.primary ?? "#EC4899", opponentCheck?.aura_color?.secondary ?? "#8B5CF6"]}
            style={styles.fighterBorder}
          >
            <Image source={{ uri: opponentCheck?.image_url }} style={styles.fighterImage} />
          </LinearGradient>
          <Text style={styles.fighterLabel}>DEFENDER</Text>
          <Text style={styles.fighterName}>@{opponent.username}</Text>
          <Text style={styles.fighterRecord}>{opponent.battle_wins}W - {opponent.battle_losses}L</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", paddingTop: 60 },
  loading: { flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  titleWrap: { position: "absolute", top: 80 },
  title: {
    color: COLORS.primary, fontSize: 42, fontWeight: "900",
    letterSpacing: 4,
    textShadowColor: "#fff", textShadowRadius: 20,
  },
  ring: { flexDirection: "row", alignItems: "center", marginTop: 180, gap: SPACING.md },
  fighter: { alignItems: "center", width: 140 },
  fighterBorder: { padding: 3, borderRadius: 70 },
  fighterImage: { width: 128, height: 128, borderRadius: 64 },
  fighterLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: "900", letterSpacing: 2, marginTop: SPACING.sm },
  fighterName: { color: "#fff", fontSize: 15, fontWeight: "900" },
  fighterRecord: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
  vs: { color: "#fff", fontSize: 48, fontWeight: "900", letterSpacing: 4 },
});
```

**Step 3: Build + open on simulator to verify phases 1-2**

```bash
cd app && npx expo run:ios
```
Navigate to the reveal screen via the history list. Expected: title flashes then fighters slide in.

**Step 4: Commit**

```bash
git add app/app/battles/reveal/
git commit -m "feat(app): reveal screen phases 1-2 (entrance + fighter intro)"
```

---

### Task 13: Reveal screen — phase 3 (round-by-round typewriter)

**Files:**
- Modify: `app/app/battles/reveal/[battleId].tsx`

**Step 1: Add rounds state + timed typewriter**

Replace the existing reveal screen with this augmented version (adds Phase 3):

Insert under `// Phase 2: Fighter slide in`:

```tsx
    // Phase 3: Rounds (start after fighter intro)
    const rounds = battle.narrative?.rounds ?? [];
    rounds.forEach((_, i) => {
      setTimeout(() => setVisibleRounds((prev) => prev + 1), 2200 + i * 1800);
    });
```

Add state near top of component:

```tsx
const [visibleRounds, setVisibleRounds] = useState(0);
```

Add rounds UI below the VS ring:

```tsx
      <View style={styles.rounds}>
        {(battle.narrative?.rounds ?? []).slice(0, visibleRounds).map((r: string, i: number) => (
          <Animated.Text
            key={i}
            entering={FadeInDown.duration(400)}
            style={styles.roundText}
          >
            {r}
          </Animated.Text>
        ))}
      </View>
```

Import `FadeInDown` from reanimated:

```tsx
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, withRepeat } from "react-native-reanimated";
```

Add styles:

```tsx
  rounds: { marginTop: SPACING.xl, paddingHorizontal: SPACING.lg, gap: SPACING.md },
  roundText: { color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center", lineHeight: 24 },
```

**Step 2: Test on simulator**

Expected: 3 rounds appear sequentially with fade+slide in.

**Step 3: Commit**

```bash
git add app/app/battles/reveal/
git commit -m "feat(app): reveal screen phase 3 (round-by-round narrative)"
```

---

### Task 14: Reveal screen — phase 4 + 5 (verdict + scorecard)

**Files:**
- Modify: `app/app/battles/reveal/[battleId].tsx`

**Step 1: Add WINNER banner + scorecard section**

After the rounds view, before the closing `</View>`, insert:

```tsx
      {visibleRounds >= (battle.narrative?.rounds ?? []).length && (
        <Animated.View entering={FadeInDown.duration(800)} style={styles.verdict}>
          <Text style={styles.winnerBanner}>
            {battle.winner_id === null ? "DRAW" : "WINNER"}
          </Text>
          <Text style={styles.marginBadge}>{battle.margin}</Text>
          <Text style={styles.finalLine}>"{battle.narrative?.final_line}"</Text>

          <View style={styles.scoreCompare}>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.compareScore}>{challengerCheck?.aura_score}</Text>
              <Text style={styles.compareLabel}>@{challenger.username}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.compareScore}>{opponentCheck?.aura_score}</Text>
              <Text style={styles.compareLabel}>@{opponent.username}</Text>
            </View>
          </View>
        </Animated.View>
      )}
```

Add styles:

```tsx
  verdict: { marginTop: SPACING.xl, alignItems: "center", paddingHorizontal: SPACING.lg },
  winnerBanner: { color: COLORS.primary, fontSize: 36, fontWeight: "900", letterSpacing: 4, textShadowColor: "#fff", textShadowRadius: 16 },
  marginBadge: {
    color: "#000", backgroundColor: COLORS.warning, paddingHorizontal: SPACING.md, paddingVertical: 4,
    borderRadius: 8, fontWeight: "900", marginTop: SPACING.sm, overflow: "hidden",
  },
  finalLine: { color: "#fff", fontSize: 16, fontStyle: "italic", marginTop: SPACING.md, textAlign: "center" },
  scoreCompare: { flexDirection: "row", justifyContent: "space-around", width: "100%", marginTop: SPACING.xl },
  compareScore: { color: COLORS.primary, fontSize: 40, fontWeight: "900" },
  compareLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: "700" },
```

**Step 2: Add haptic on final reveal**

Import at top:

```tsx
import * as Haptics from "expo-haptics";
```

In the `useEffect` that runs after battle loads, after the rounds are scheduled:

```tsx
    const rounds = battle.narrative?.rounds ?? [];
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2200 + rounds.length * 1800);
```

**Step 3: Test on device**

Open a completed battle from history. Expect: entrance → fighters → rounds → WINNER banner + scorecard, with haptic tap at the end.

**Step 4: Commit**

```bash
git add app/app/battles/reveal/
git commit -m "feat(app): reveal screen phases 4-5 (winner verdict + scorecard + haptic)"
```

---

## Phase 7 — Ship it

### Task 15: End-to-end production test

**Step 1: Deploy server**

```bash
cd server && flyctl deploy --remote-only
```

**Step 2: Rebuild mobile app (Release)**

```bash
cd app && export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 && npx expo run:ios --device "00008140-000124890CE0801C" --configuration Release
```

**Step 3: Manual test on phone (one phone, 2 accounts)**

1. Sign in as user A
2. Go to Battles tab → Friends → ensure user B is in circle (add if not)
3. Tap user B → "Challenge" → pick path → camera → send
4. Sign out → sign in as user B
5. Battles tab should show incoming challenge
6. Tap Accept → camera → submit
7. Reveal screen plays the anime sequence with narrative
8. Both users' W/L records update

**Step 4: Verify DB state**

Via Supabase MCP `execute_sql`:

```sql
SELECT id, status, margin, winner_id, narrative FROM battles ORDER BY created_at DESC LIMIT 5;
SELECT username, battle_wins, battle_losses, battle_draws, battle_streak FROM profiles ORDER BY updated_at DESC LIMIT 10;
```

Expected: latest battle `status='completed'`, `margin` set, narrative present, both users' records incremented.

**Step 5: Commit any touch-ups**

```bash
git add -A
git commit -m "feat: aura battles ready for testers 🥊"
git push origin master
```

---

## Done — what the testers get

- A Battles tab with boxer W-L-D record and streak
- 1v1 async challenges, 24h expiry, camera-only
- 7 Sigma Paths locked in by challenger
- Anime reveal screen with 5 phases and haptic
- Push-ready (notifications scaffold already exists, can enable in follow-up)
- Private to the two players (share button deferred to follow-up)

## Deferred to follow-ups

- Push notification sending (Expo Push Tokens registered, but server-side send function not wired)
- Share battle result as image (use react-native-view-shot on the reveal screen)
- Sound effects on round transitions (expo-av)
- Spectator mode / public battles feed
