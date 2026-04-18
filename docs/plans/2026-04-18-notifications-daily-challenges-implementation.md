# Notifications + Daily Challenges — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship five notification types (daily reminder, streak saver, battle accepted, friend request, daily challenge) and finish the daily-challenges feature (banner + bonus multiplier + completion tracking) in a single EAS build cycle.

**Architecture:** Hybrid delivery — local `expo-notifications` schedules on-device for time-based reminders, Fastify server pushes via Expo Push API for event-driven events. New `push_tokens` Supabase table with RLS. Vercel Cron fires 18:00 UTC daily to trigger the daily-challenge broadcast endpoint on Fastify. Daily challenges stay as a hardcoded rotation in server code; completion is tracked by a new boolean column on `aura_checks`.

**Tech Stack:** `expo-notifications`, Expo Push API, Fastify 5, Supabase (Postgres + RLS), Vercel Cron, Pino logging.

**Reference:** Design doc at `docs/plans/2026-04-18-notifications-daily-challenges-design.md`.

---

## Task 1: Migration for `push_tokens` + `aura_checks.challenge_completed`

**Files:**
- Create: `supabase/migrations/004_notifications_and_challenges.sql`

**Step 1: Write the migration**

```sql
-- Push tokens: one row per user (pre-launch scale; multi-device is a later concern)
create table public.push_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz default now()
);

alter table public.push_tokens enable row level security;

-- Users can read/write only their own token row
create policy "push_tokens_self"
  on public.push_tokens for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Track which aura_checks qualified for today's daily challenge
alter table public.aura_checks
  add column challenge_completed boolean not null default false;
```

**Step 2: Apply the migration**

User-side action (call this out in the end-of-plan checklist): paste into Supabase Dashboard → SQL Editor → Run. Do NOT apply during implementation — just write the file, commit, and note the manual step.

**Step 3: Commit**

```bash
git add supabase/migrations/004_notifications_and_challenges.sql
git commit -m "feat(db): add push_tokens table + aura_checks.challenge_completed"
```

---

## Task 2 (TDD): Server-side push helper `server/src/lib/push.ts`

**Files:**
- Create: `server/src/lib/push.ts`
- Create: `server/src/lib/__tests__/push.test.ts`

**Step 1: Write the failing tests**

```ts
// server/src/lib/__tests__/push.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendPush } from '../push';

// Mock the Supabase client module this lib uses; adjust path to match existing convention.
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
});

describe('sendPush', () => {
  it('POSTs to Expo Push API with the user token, title, body, data', async () => {
    const { supabase } = await import('../supabase');
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { expo_push_token: 'ExponentPushToken[abc]', platform: 'ios' },
        error: null,
      }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ status: 'ok' }] }),
    });

    await sendPush('user-1', { title: 'T', body: 'B', data: { url: 'mogster://x' } });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify([
          { to: 'ExponentPushToken[abc]', title: 'T', body: 'B', data: { url: 'mogster://x' } },
        ]),
      }),
    );
  });

  it('no-ops silently if the user has no push token row', async () => {
    const { supabase } = await import('../supabase');
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    await sendPush('user-no-token', { title: 'T', body: 'B' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('deletes the token row when Expo returns DeviceNotRegistered', async () => {
    const { supabase } = await import('../supabase');
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEq });
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { expo_push_token: 'ExponentPushToken[stale]', platform: 'ios' },
        error: null,
      }),
      delete: deleteMock,
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }] }),
    });

    await sendPush('user-stale', { title: 'T', body: 'B' });

    expect(deleteMock).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith('user_id', 'user-stale');
  });

  it('does not throw when fetch rejects (fire-and-forget)', async () => {
    const { supabase } = await import('../supabase');
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { expo_push_token: 'ExponentPushToken[x]', platform: 'ios' },
        error: null,
      }),
    });
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    await expect(sendPush('u', { title: 't', body: 'b' })).resolves.toBeUndefined();
  });
});
```

**Step 2: Run — fails** (`cd server && npm test`)

Expected: "Cannot find module '../push'" or similar.

**Step 3: Implement `push.ts`**

```ts
// server/src/lib/push.ts
import { supabase } from './supabase';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  try {
    const { data: tokenRow } = await supabase
      .from('push_tokens')
      .select('expo_push_token, platform')
      .eq('user_id', userId)
      .maybeSingle();

    if (!tokenRow) return;

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          to: tokenRow.expo_push_token,
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
        },
      ]),
    });

    const result = await response.json().catch(() => null);
    const ticket = result?.data?.[0];
    if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
      await supabase.from('push_tokens').delete().eq('user_id', userId);
    }
  } catch (err) {
    // Fire-and-forget: never throw from here
    console.warn('[sendPush] failed for user', userId, err);
  }
}
```

**Step 4: Run — passes** (`cd server && npm test`)

**Step 5: Commit**

```bash
git add server/src/lib/push.ts server/src/lib/__tests__/push.test.ts
git commit -m "feat(server): add sendPush helper for Expo Push API (TDD)"
```

---

## Task 3 (TDD): `/push/register` and `/push/unregister` routes

**Files:**
- Create: `server/src/routes/push.ts`
- Create: `server/src/routes/__tests__/push.test.ts`
- Modify: `server/src/index.ts` — register the new routes

**Step 1: Write the failing tests**

```ts
// server/src/routes/__tests__/push.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { pushRoutes } from '../push';

vi.mock('../../middleware/auth', () => ({
  requireAuth: async (req: any) => { req.userId = 'user-1'; },
}));

const upsertFn = vi.fn();
const deleteEq = vi.fn();
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: upsertFn,
      delete: vi.fn(() => ({ eq: deleteEq })),
    })),
  },
}));

beforeEach(() => {
  upsertFn.mockReset();
  deleteEq.mockReset();
  upsertFn.mockResolvedValue({ error: null });
  deleteEq.mockResolvedValue({ error: null });
});

async function buildApp() {
  const app = Fastify();
  await app.register(pushRoutes);
  return app;
}

describe('push routes', () => {
  it('POST /push/register upserts a token row', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/push/register',
      payload: { expo_push_token: 'ExponentPushToken[abc]', platform: 'ios' },
    });
    expect(res.statusCode).toBe(200);
    expect(upsertFn).toHaveBeenCalledWith(
      { user_id: 'user-1', expo_push_token: 'ExponentPushToken[abc]', platform: 'ios', updated_at: expect.any(String) },
      { onConflict: 'user_id' },
    );
  });

  it('POST /push/register rejects invalid platform', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/push/register',
      payload: { expo_push_token: 'X', platform: 'windows' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /push/unregister deletes the user row', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/push/unregister' });
    expect(res.statusCode).toBe(200);
    expect(deleteEq).toHaveBeenCalledWith('user_id', 'user-1');
  });
});
```

**Step 2: Run — fails**

**Step 3: Implement the route**

```ts
// server/src/routes/push.ts
import { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

interface RegisterBody {
  expo_push_token: string;
  platform: 'ios' | 'android';
}

export async function pushRoutes(app: FastifyInstance) {
  app.post<{ Body: RegisterBody }>('/push/register', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        required: ['expo_push_token', 'platform'],
        properties: {
          expo_push_token: { type: 'string', minLength: 1 },
          platform: { type: 'string', enum: ['ios', 'android'] },
        },
      },
    },
  }, async (req) => {
    const userId = (req as any).userId as string;
    const { expo_push_token, platform } = req.body;
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, expo_push_token, platform, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

  app.post('/push/unregister', {
    preHandler: requireAuth,
  }, async (req) => {
    const userId = (req as any).userId as string;
    const { error } = await supabase.from('push_tokens').delete().eq('user_id', userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
}
```

**Step 4: Wire into `server/src/index.ts`**

Look for the existing `app.register(...)` calls for battles/friends/etc. and add a sibling line:
```ts
import { pushRoutes } from './routes/push';
// ...
await app.register(pushRoutes);
```

**Step 5: Run — passes** (`cd server && npm test`)

**Step 6: Commit**

```bash
git add server/src/routes/push.ts server/src/routes/__tests__/push.test.ts server/src/index.ts
git commit -m "feat(server): add /push/register + /push/unregister routes (TDD)"
```

---

## Task 4 (TDD): Daily challenge bonus application in `/aura/rate`

**Files:**
- Modify: `server/src/routes/aura.ts` — apply bonus when sigma_path matches today's challenge, mark `challenge_completed=true`
- Modify (or create): `server/src/routes/__tests__/aura.test.ts` — add tests for the bonus logic
- Create: `server/src/lib/daily.ts` — extracted helper for today's-challenge lookup (pure function, testable)
- Create: `server/src/lib/__tests__/daily.test.ts`

**Step 1: Extract the rotating-challenges logic into a pure helper**

```ts
// server/src/lib/daily.ts
export const ROTATING_CHALLENGES = [
  { title: 'Mogger Monday',         description: "Show the world you're mogging. Mogger Mode only.", sigma_path: 'mogger_mode',     bonus_multiplier: 1.5 },
  { title: 'Transformation Tuesday',description: 'Glow-up check. Best looksmaxxing pic wins.',        sigma_path: 'looksmaxxing',    bonus_multiplier: 1.5 },
  { title: 'Wildcard Wednesday',    description: 'Any path. Any vibe. Just cook.',                     sigma_path: null,              bonus_multiplier: 2.0 },
  { title: 'Rizz Thursday',         description: 'Main character energy only. Show your rizz.',        sigma_path: 'rizzmaxxing',     bonus_multiplier: 1.5 },
  { title: 'Flex Friday',           description: 'Statusmaxxing activated. Show the drip.',            sigma_path: 'statusmaxxing',   bonus_multiplier: 1.5 },
  { title: 'Sigma Saturday',        description: 'Grindset check. Are you on your sigma arc?',         sigma_path: 'sigma_grindset',  bonus_multiplier: 1.5 },
  { title: 'Brainrot Sunday',       description: 'Full chaos. Ohio energy. Most unhinged pic wins.',   sigma_path: 'brainrot_mode',   bonus_multiplier: 2.0 },
] as const;

export function getTodayChallenge(now = new Date()) {
  const dayMap = [6, 0, 1, 2, 3, 4, 5]; // Sun->6, Mon->0, etc.
  return ROTATING_CHALLENGES[dayMap[now.getDay()]];
}

export interface BonusResult {
  finalScore: number;
  multiplier: number;
  challengeCompleted: boolean;
}

export function applyChallengeBonus(
  baseScore: number,
  submittedSigmaPath: string,
  now = new Date(),
): BonusResult {
  const today = getTodayChallenge(now);
  const matches = today.sigma_path === null || today.sigma_path === submittedSigmaPath;
  const multiplier = matches ? today.bonus_multiplier : 1.0;
  return {
    finalScore: Math.round(baseScore * multiplier),
    multiplier,
    challengeCompleted: matches,
  };
}
```

**Step 2: Tests for the helper**

```ts
// server/src/lib/__tests__/daily.test.ts
import { describe, it, expect } from 'vitest';
import { applyChallengeBonus, getTodayChallenge } from '../daily';

describe('getTodayChallenge', () => {
  it('Monday → Mogger Monday', () => {
    const monday = new Date('2026-04-20T12:00:00Z');  // a Monday
    expect(getTodayChallenge(monday).title).toBe('Mogger Monday');
  });
  it('Wednesday → Wildcard Wednesday (sigma_path null)', () => {
    const wed = new Date('2026-04-22T12:00:00Z');
    const c = getTodayChallenge(wed);
    expect(c.title).toBe('Wildcard Wednesday');
    expect(c.sigma_path).toBeNull();
  });
});

describe('applyChallengeBonus', () => {
  it('matching sigma_path applies bonus and marks completed', () => {
    const monday = new Date('2026-04-20T12:00:00Z');
    const r = applyChallengeBonus(500, 'mogger_mode', monday);
    expect(r.finalScore).toBe(750);
    expect(r.multiplier).toBe(1.5);
    expect(r.challengeCompleted).toBe(true);
  });

  it('non-matching sigma_path uses multiplier 1.0', () => {
    const monday = new Date('2026-04-20T12:00:00Z');
    const r = applyChallengeBonus(500, 'rizzmaxxing', monday);
    expect(r.finalScore).toBe(500);
    expect(r.multiplier).toBe(1.0);
    expect(r.challengeCompleted).toBe(false);
  });

  it('Wildcard Wednesday applies bonus regardless of sigma_path', () => {
    const wed = new Date('2026-04-22T12:00:00Z');
    const r = applyChallengeBonus(500, 'brainrot_mode', wed);
    expect(r.finalScore).toBe(1000);
    expect(r.multiplier).toBe(2.0);
    expect(r.challengeCompleted).toBe(true);
  });
});
```

Run both tests — helper tests must pass. Aura integration will be added in Step 3.

**Step 3: Modify `server/src/routes/aura.ts`**

Locate the insert into `aura_checks` (the line that writes the scored result to the DB). Before the insert:

```ts
import { applyChallengeBonus } from '../lib/daily';

// ...where you have the base score from Gemini:
const { finalScore, challengeCompleted } = applyChallengeBonus(baseScore, submission.sigma_path);
// then insert using finalScore and include challenge_completed: challengeCompleted
```

Also refactor `server/src/routes/daily.ts` to import the same helper so the `/daily/today` endpoint and the bonus application stay in sync.

**Step 4: Update `server/src/routes/daily.ts` to use the shared helper**

```ts
// server/src/routes/daily.ts
import { FastifyInstance } from 'fastify';
import { getTodayChallenge } from '../lib/daily';

export async function dailyRoutes(app: FastifyInstance) {
  app.get('/daily/today', async () => {
    const challenge = getTodayChallenge();
    const today = new Date().toISOString().split('T')[0];
    return { ...challenge, challenge_date: today };
  });
}
```

**Step 5: Run — passes**

**Step 6: Commit**

```bash
git add server/src/lib/daily.ts server/src/lib/__tests__/daily.test.ts server/src/routes/aura.ts server/src/routes/daily.ts
git commit -m "feat(server): apply daily challenge bonus to aura submissions (TDD)"
```

---

## Task 5 (TDD): `/cron/daily-challenge-announce` endpoint

**Files:**
- Create: `server/src/routes/cron.ts`
- Create: `server/src/routes/__tests__/cron.test.ts`
- Modify: `server/src/index.ts` — register cron routes

**Step 1: Failing test**

```ts
// server/src/routes/__tests__/cron.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { cronRoutes } from '../cron';

vi.mock('../../lib/push', () => ({
  sendPush: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: [{ user_id: 'u1' }, { user_id: 'u2' }],
        error: null,
      }),
    })),
  },
}));

const SECRET = 'test-secret';
process.env.CRON_SHARED_SECRET = SECRET;

async function buildApp() {
  const app = Fastify();
  await app.register(cronRoutes);
  return app;
}

beforeEach(() => vi.clearAllMocks());

describe('POST /cron/daily-challenge-announce', () => {
  it('rejects without shared secret header', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/cron/daily-challenge-announce' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects with wrong shared secret', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/cron/daily-challenge-announce',
      headers: { 'x-cron-secret': 'wrong' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('sends a push to every user with a push token', async () => {
    const { sendPush } = await import('../../lib/push');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/cron/daily-challenge-announce',
      headers: { 'x-cron-secret': SECRET },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.count).toBe(2);
    expect(sendPush).toHaveBeenCalledTimes(2);
    expect(sendPush).toHaveBeenCalledWith('u1', expect.objectContaining({
      data: { url: 'mogster://' },
    }));
  });
});
```

**Step 2: Run — fails**

**Step 3: Implement**

```ts
// server/src/routes/cron.ts
import { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';
import { sendPush } from '../lib/push';
import { getTodayChallenge } from '../lib/daily';

export async function cronRoutes(app: FastifyInstance) {
  app.post('/cron/daily-challenge-announce', async (req, reply) => {
    const secret = req.headers['x-cron-secret'];
    if (!secret || secret !== process.env.CRON_SHARED_SECRET) {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    const challenge = getTodayChallenge();
    const { data: rows, error } = await supabase
      .from('push_tokens')
      .select('user_id');
    if (error) {
      app.log.error(error, 'cron/daily-challenge: failed to list push_tokens');
      return reply.code(500).send({ error: 'db_error' });
    }

    const title = `Today's challenge: ${challenge.title}`;
    const body = `${challenge.description} +${challenge.bonus_multiplier}× aura if you pass.`;
    let count = 0;
    for (const row of rows ?? []) {
      await sendPush(row.user_id, {
        title,
        body,
        data: { url: 'mogster://' },
      });
      count++;
    }
    return { ok: true, count };
  });
}
```

**Step 4: Wire into `server/src/index.ts`**

```ts
import { cronRoutes } from './routes/cron';
// ...
await app.register(cronRoutes);
```

**Step 5: Set `CRON_SHARED_SECRET`** — add to `server/.env.example` (document) and remind user to set it in Railway env.

**Step 6: Commit**

```bash
git add server/src/routes/cron.ts server/src/routes/__tests__/cron.test.ts server/src/index.ts server/.env.example
git commit -m "feat(server): add /cron/daily-challenge-announce endpoint (TDD)"
```

---

## Task 6: Fire push from battle accept and friend request

**Files:**
- Modify: `server/src/routes/battles.ts` around the `POST /battles/:id/accept` handler
- Modify: `server/src/routes/friends.ts` around the `POST /friends/request` handler (or whichever handler creates a new friend request row)

**Step 1: In `battles.ts`, after the DB update for accept succeeds:**

```ts
import { sendPush } from '../lib/push';
// ...
// After updating battle status + generating narrative:
void sendPush(battle.challenger_id, {
  title: `${accepter.username} accepted your battle`,
  body: 'Go see who mogged harder.',
  data: { url: `mogster://battles/reveal/${battle.id}` },
});
```

Note `void` — fire-and-forget. Do not `await` here; push failures must not fail the accept response.

**Step 2: In `friends.ts`, after inserting the friendship request row:**

```ts
import { sendPush } from '../lib/push';
// ...
void sendPush(addressee_id, {
  title: `${requester.username} wants to join your circle`,
  body: 'Accept or decline in Battles.',
  data: { url: 'mogster://battles' },
});
```

**Step 3: Typecheck**

```bash
cd server && npx tsc --noEmit
```
Must pass.

**Step 4: Update tests if they exist for these handlers**

If `server/src/battles/__tests__/battle.test.ts` or similar asserts on handler return values, it should still pass — we only added a side-effect. If needed, mock `sendPush` to avoid network attempts during tests.

**Step 5: Commit**

```bash
git add server/src/routes/battles.ts server/src/routes/friends.ts
git commit -m "feat(server): fire-and-forget push on battle-accept and friend-request"
```

---

## Task 7: Vercel Cron wrapper in `web/`

**Files:**
- Create: `web/app/api/cron/daily-challenge/route.ts`
- Create: `web/vercel.json`
- Modify: `web/.env.local.example` — document `CRON_SECRET` and `FASTIFY_CRON_SECRET` + `FASTIFY_URL`

**Step 1: Vercel cron config**

```json
// web/vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-challenge",
      "schedule": "0 18 * * *"
    }
  ]
}
```

**Step 2: The route handler**

```ts
// web/app/api/cron/daily-challenge/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Vercel Cron authenticates via a Bearer header with CRON_SECRET
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const fastifyUrl = process.env.FASTIFY_URL;
  const fastifySecret = process.env.FASTIFY_CRON_SECRET;
  if (!fastifyUrl || !fastifySecret) {
    return new NextResponse('Missing FASTIFY_URL or FASTIFY_CRON_SECRET', { status: 500 });
  }

  const res = await fetch(`${fastifyUrl}/cron/daily-challenge-announce`, {
    method: 'POST',
    headers: { 'x-cron-secret': fastifySecret, 'Content-Type': 'application/json' },
  });

  const text = await res.text();
  return new NextResponse(text, { status: res.status });
}
```

**Step 3: Env doc**

Append to `web/.env.local.example`:
```
# Vercel Cron (set in Vercel project env, not local .env.local)
CRON_SECRET=<generate a long random string>
# Fastify server URL and the matching CRON_SHARED_SECRET value from Railway
FASTIFY_URL=https://mogster-production.up.railway.app
FASTIFY_CRON_SECRET=<same value as server's CRON_SHARED_SECRET>
```

**Step 4: Verify build**

```bash
cd web && npm run build
```
The new `/api/cron/daily-challenge` route should appear in the routes list.

**Step 5: Commit**

```bash
git add web/vercel.json web/app/api/cron/daily-challenge/route.ts web/.env.local.example
git commit -m "feat(web): Vercel cron wrapper that triggers Fastify daily-challenge broadcast"
```

---

## Task 8: App — install `expo-notifications` and configure app.json

**Files:**
- Modify: `app/package.json`
- Modify: `app/app.json`

**Step 1: Install**

```bash
cd /Users/grgurdamiani/Aurate/app
npx expo install expo-notifications expo-device
```

(`expo-device` is used by `expo-notifications` examples to skip registration in simulators; safe and small.)

**Step 2: Add plugin + iOS capability to `app.json`**

Under `expo.plugins`, add:
```json
[
  "expo-notifications",
  {
    "icon": "./assets/images/icon.png",
    "color": "#FFD60A"
  }
]
```

Under `expo.ios`, add:
```json
"infoPlist": {
  "NSPhotoLibraryUsageDescription": "...",
  "NSCameraUsageDescription": "...",
  "ITSAppUsesNonExemptEncryption": false,
  "UIBackgroundModes": ["remote-notification"]
}
```

**Step 3: Typecheck**

```bash
cd /Users/grgurdamiani/Aurate/app && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add app/package.json app/package-lock.json app/app.json
git commit -m "chore(app): install expo-notifications + configure push capability"
```

---

## Task 9 (TDD): App notifications module

**Files:**
- Create: `app/src/lib/notifications.ts`
- Create: `app/src/lib/__tests__/notifications.test.ts`

Since the app has no test infra yet, this task also sets up Vitest for the app. If that's out of scope today, simplify: write `notifications.ts` WITHOUT tests for now, note it as a follow-up, and move on. (This is consistent with the original audit's "App has 0 tests" finding — fixing test infra is a separate bigger task.)

**Pragmatic path (no tests):** skip the test file, implement directly.

```ts
// app/src/lib/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiFetch } from './api';

const DAILY_REMINDER_ID = 'daily-reminder';
const STREAK_SAVER_ID = 'streak-saver';

// Foreground behavior: show alerts even when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissionsAndRegister(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    status = newStatus;
  }
  if (status !== 'granted') return null;

  const tokenResult = await Notifications.getExpoPushTokenAsync();
  const token = tokenResult.data;

  try {
    await apiFetch('/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expo_push_token: token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      }),
    });
  } catch (err) {
    console.warn('Failed to register push token with server', err);
  }

  await scheduleDailyReminder();
  return token;
}

export async function unregister(): Promise<void> {
  await cancelAllLocal();
  try {
    await apiFetch('/push/unregister', { method: 'POST' });
  } catch (err) {
    console.warn('Failed to unregister push token', err);
  }
}

export async function scheduleDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'Your aura is rotting. 📸',
      body: 'Tap in and get rated before midnight.',
      data: { url: 'mogster://' },
    },
    trigger: {
      hour: 18,
      minute: 0,
      repeats: true,
    },
  });
}

export async function scheduleStreakSaver(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(STREAK_SAVER_ID).catch(() => {});
  // Fire tomorrow at 22:00 local; user should check in before that to cancel
  const now = new Date();
  const trigger = new Date();
  trigger.setHours(22, 0, 0, 0);
  if (trigger.getTime() <= now.getTime()) trigger.setDate(trigger.getDate() + 1);
  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_SAVER_ID,
    content: {
      title: '🔥 Your streak is about to die',
      body: 'Two hours left. Check in or lose it.',
      data: { url: 'mogster://' },
    },
    trigger: { date: trigger },
  });
}

export async function cancelAllLocal(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getPermissionStatus() {
  return await Notifications.getPermissionsAsync();
}
```

**Commit**

```bash
git add app/src/lib/notifications.ts
git commit -m "feat(app): add notifications module — permission, register, local schedules"
```

---

## Task 10: Permission primer screen + Settings toggle

**Files:**
- Create: `app/app/onboarding/notifications.tsx` — the primer screen
- Modify: `app/app/onboarding/index.tsx` — route to notifications primer at the end
- Modify: `app/app/(tabs)/your-aura.tsx` — add a NOTIFICATIONS toggle row in settings
- Modify: `app/src/store/authStore.ts` — add a `notificationsEnabled` flag or read via `getPermissionStatus`

**Step 1: Permission primer screen**

```tsx
// app/app/onboarding/notifications.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPermissionsAndRegister } from '@/src/lib/notifications';
import { useAuthStore } from '@/src/store/authStore';

const PRIMER_DECLINED_KEY = 'notification_primer_declined_at';

export default function NotificationsPrimer() {
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const onAllow = async () => {
    await requestPermissionsAndRegister();
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  const onLater = async () => {
    await AsyncStorage.setItem(PRIMER_DECLINED_KEY, new Date().toISOString());
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📸</Text>
      <Text style={styles.headline}>AURA NEEDS DAILY.</Text>
      <Text style={styles.pitch}>
        A quick daily reminder so your streak doesn't die and you don't miss today's challenge bonus.
      </Text>
      <TouchableOpacity style={styles.primary} onPress={onAllow}>
        <Text style={styles.primaryText}>TURN ON NOTIFICATIONS →</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={onLater}>
        <Text style={styles.secondaryText}>Maybe later</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFD60A' },
  emoji: { fontSize: 56, textAlign: 'center', marginBottom: 24 },
  headline: { fontSize: 40, fontWeight: '900', textAlign: 'center', color: '#0A0A0A', marginBottom: 12 },
  pitch: { fontSize: 16, textAlign: 'center', color: '#0A0A0A', marginBottom: 40 },
  primary: { backgroundColor: '#0A0A0A', padding: 18, marginBottom: 12 },
  primaryText: { color: '#FFD60A', textAlign: 'center', fontSize: 18, fontWeight: '900' },
  secondary: { padding: 12 },
  secondaryText: { color: '#0A0A0A', textAlign: 'center', textDecorationLine: 'underline' },
});
```

**Step 2: Wire the primer into the onboarding flow**

In `app/app/onboarding/index.tsx`, where you currently call `completeOnboarding()` at the end, replace with `router.push('/onboarding/notifications')` so the primer runs next and owns the final `completeOnboarding` call.

**Step 3: Settings toggle**

In `app/app/(tabs)/your-aura.tsx`, add a new settings row inside the existing settings card (near the PRIVACY/TERMS links). Use a Switch component or a simple toggle touchable:

```tsx
import { Switch } from 'react-native';
import { useEffect, useState } from 'react';
import { getPermissionStatus, requestPermissionsAndRegister, unregister } from '@/src/lib/notifications';

// inside the component:
const [notifOn, setNotifOn] = useState(false);
useEffect(() => {
  (async () => {
    const { status } = await getPermissionStatus();
    setNotifOn(status === 'granted');
  })();
}, []);

const toggleNotif = async (v: boolean) => {
  setNotifOn(v);
  if (v) await requestPermissionsAndRegister();
  else await unregister();
};

// In JSX, within the settings card:
<View style={styles.settingsRow}>
  <Text style={styles.settingsRowLabel}>NOTIFICATIONS</Text>
  <Switch value={notifOn} onValueChange={toggleNotif} />
</View>
```

**Step 4: Typecheck**

**Step 5: Commit**

```bash
git add app/app/onboarding/notifications.tsx app/app/onboarding/index.tsx app/app/(tabs)/your-aura.tsx
git commit -m "feat(app): notification permission primer + Settings toggle"
```

---

## Task 11: Notification-tap deep-link routing

**Files:**
- Modify: `app/app/_layout.tsx`

**Step 1: Extend the existing Linking handler to also handle notification taps**

Locate the existing effect that listens for `Linking` events. Add a sibling effect:

```ts
import * as Notifications from 'expo-notifications';
// ...inside RootLayoutNav:
useEffect(() => {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url as string | undefined;
    if (typeof url === 'string' && url.length > 0) {
      // Reuse the same URL handler that handles mogster:// cold-start links
      handleUrl(url);  // or Linking.openURL(url), whichever the existing code uses
    }
  });
  return () => sub.remove();
}, []);
```

The existing `handleUrl` / `parseTokensFromMogsterUrl` logic already knows how to route `mogster://auth/callback`. Extend it to also branch on `mogster://battles/reveal/<id>` and `mogster://battles`:

```ts
// Inside handleUrl, after the auth/callback branch:
if (parsed.scheme === 'mogster' && parsed.hostname === 'battles') {
  if (parsed.path?.startsWith('reveal/')) {
    const battleId = parsed.path.slice('reveal/'.length);
    router.push(`/battles/reveal/${battleId}`);
  } else {
    router.push('/(tabs)/battles');
  }
}
```

**Step 2: Typecheck**

**Step 3: Commit**

```bash
git add app/app/_layout.tsx
git commit -m "feat(app): route notification taps via deep-link handler"
```

---

## Task 12: Streak-saver scheduling hook into aura submission

**Files:**
- Modify: `app/src/store/authStore.ts` OR wherever the aura-submission success handler lives (check `app/app/(tabs)/index.tsx` or the capture/result screens)

**Step 1: After a successful aura submission, reschedule streak saver**

```ts
import { scheduleStreakSaver } from '@/src/lib/notifications';
// ...in the post-submit handler:
void scheduleStreakSaver();
```

Fire-and-forget (scheduling failure shouldn't fail submission).

**Step 2: Commit**

```bash
git add app/app/...  # whatever was modified
git commit -m "feat(app): reschedule streak-saver after aura submission"
```

---

## Task 13: DailyChallengeBanner component + wire into home

**Files:**
- Create: `app/src/components/daily/DailyChallengeBanner.tsx`
- Modify: `app/app/(tabs)/index.tsx`
- Modify: `app/src/lib/api.ts` if needed (should already have a `getDailyToday()` helper or similar — add if missing)

**Step 1: Banner component**

```tsx
// app/src/components/daily/DailyChallengeBanner.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/src/lib/api';

interface Challenge {
  title: string;
  description: string;
  sigma_path: string | null;
  bonus_multiplier: number;
  challenge_date: string;
}

interface Props {
  completed?: boolean;
}

export function DailyChallengeBanner({ completed = false }: Props) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  useEffect(() => {
    apiFetch('/daily/today')
      .then((r) => r.json())
      .then(setChallenge)
      .catch(() => {});
  }, []);

  if (!challenge) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.badge}>+{challenge.bonus_multiplier}× AURA</Text>
      <Text style={styles.title}>{challenge.title.toUpperCase()}</Text>
      <Text style={styles.desc}>{challenge.description}</Text>
      {completed && <Text style={styles.completed}>✅ COMPLETED TODAY</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0A0A0A',
    borderWidth: 2,
    borderColor: '#FFD60A',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  badge: {
    color: '#FFD60A',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: { color: '#FFD60A', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  desc: { color: '#F5F1E6', marginTop: 6, fontSize: 14 },
  completed: { color: '#FFD60A', marginTop: 10, fontWeight: '900' },
});
```

**Step 2: Render in `app/app/(tabs)/index.tsx`**

Place the `<DailyChallengeBanner />` at the top of the scroll view / main content area. To drive `completed`, fetch whether the user has a `challenge_completed=true` aura_check for today — or pass it down from the home screen's existing state if an aura-result lookup already runs there. If there's no easy way to get that state today, leave `completed={false}` for MVP and let the visual refresh-on-submit be a follow-up.

**Step 3: Typecheck + build**

**Step 4: Commit**

```bash
git add app/src/components/daily/DailyChallengeBanner.tsx app/app/(tabs)/index.tsx
git commit -m "feat(app): daily challenge banner on home tab"
```

---

## Task 14: User actions — Supabase migration + env vars + EAS build

This task is the user's responsibility, not Claude's. Documented here for completeness.

### 14a. Apply the Supabase migration
Supabase dashboard → SQL Editor → New query → paste `supabase/migrations/004_notifications_and_challenges.sql` → Run.

Expected: no errors; `push_tokens` table exists; `aura_checks.challenge_completed` column exists.

### 14b. Fastify server env
In Railway (or wherever Fastify is hosted) → add:
```
CRON_SHARED_SECRET=<long random string — save this>
```
Redeploy.

### 14c. Vercel env
In Vercel → `mogster-web` project → Settings → Environment Variables, add (Production + Preview + Development):
```
CRON_SECRET=<long random string>
FASTIFY_URL=https://mogster-production.up.railway.app
FASTIFY_CRON_SECRET=<same value as Railway's CRON_SHARED_SECRET>
```
Redeploy. Also verify the cron appears in Vercel → Crons after next deploy.

### 14d. EAS build + submit
```bash
cd /Users/grgurdamiani/Aurate/app
eas build --platform ios --profile production --auto-submit
```
Wait ~20 min total (build + submit + Apple processing). New TestFlight build will include push capability.

### 14e. End-to-end verification
1. Install the new build on a physical iPhone (not simulator — push doesn't work on iOS sim)
2. Complete onboarding → primer screen → Allow → verify `push_tokens` row exists in Supabase
3. Submit an aura on whichever day matches today's challenge → verify score has bonus applied + `challenge_completed=true` in Supabase
4. From a second device, accept a battle started by device 1 → device 1 receives push
5. Send a friend request from B to A → A receives push
6. Wait until 18:00 UTC (or manually hit `POST /cron/daily-challenge-announce` with the shared secret) → all opted-in devices receive push

---

## Follow-ups (out of scope for this plan)

- App-side test infrastructure (Vitest + RN Testing Library)
- Per-category notification preferences
- Timezone-aware daily challenge broadcast
- Multi-device push token support
- Drop the unused `daily_challenges` DB table (003 didn't use it, neither does this)
- Move hardcoded Supabase/API URLs back to env vars (tracked as a spawned task from earlier in the session)
