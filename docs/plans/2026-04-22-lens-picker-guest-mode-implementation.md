# Lens Picker + Guest Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship two features together in the next TestFlight cycle: a vertical lens-picker modal (replacing the broken horizontal chip scroll), and guest mode that lets unauthenticated users browse the app and take one free aura rating before hitting a signup wall.

**Architecture:** A new `/aura/rate-guest` Fastify endpoint serves ephemeral ratings (no DB write, rate-limited by IP via Upstash Redis). The app's route guard drops its `!user → /auth/signup` redirect, letting guests flow through onboarding into tabs. AsyncStorage tracks `guest_uploads_used`; on the 2nd attempt or on any other gated action, a `SignupSheet` bottom sheet appears. Lens picker modal replaces the overflow-broken chip row with a tap-to-open selector.

**Tech Stack:** React Native (Expo), Fastify 5, Supabase auth, Upstash Redis, AsyncStorage, Anton/JetBrains Mono fonts.

**Reference:** Design doc at `docs/plans/2026-04-22-lens-picker-guest-mode-design.md`.

---

## Task 1 (TDD): Server `/aura/rate-guest` endpoint

**Files:**
- Modify: `server/src/routes/aura.ts`
- Create or extend: `server/src/routes/__tests__/aura.test.ts`
- Potentially modify: `server/src/lib/rateLimit.ts` if a shared helper exists; otherwise inline the Redis rate-limit

### Step 1: Understand the existing `/aura/rate` handler

Read `server/src/routes/aura.ts`. Identify:
- The Gemini rating helper (likely imported from `server/src/ai/...`)
- The request body schema
- The response shape
- Whether there's a shared Upstash Redis client import

### Step 2: Write failing tests for the new handler

Add to `server/src/routes/__tests__/aura.test.ts`:

```ts
describe('POST /aura/rate-guest', () => {
  beforeEach(() => {
    // mocks: Gemini helper returns a fixed score/roast; redis increment helper
  });

  it('accepts a request without an Authorization header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/aura/rate-guest',
      payload: { image_b64: 'ZmFrZQ==', sigma_path: 'rizzmaxxing' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns score + roast + personality_read in the response', async () => {
    const res = await app.inject({ /* ... */ });
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({
      score: expect.any(Number),
      roast: expect.any(String),
      personality_read: expect.any(String),
    });
    expect(body).not.toHaveProperty('id');  // ephemeral — no DB row
  });

  it('does NOT insert into aura_checks', async () => {
    const insertSpy = vi.fn();
    // ... wire supabase mock's insert to insertSpy
    await app.inject({ /* ... */ });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('does NOT apply daily challenge bonus', async () => {
    // even on a day where sigma_path matches, returns base Gemini score unmodified
    const res = await app.inject({ /* ... matching path ... */ });
    const body = JSON.parse(res.body);
    expect(body.score).toBe(BASE_SCORE);  // not BASE * multiplier
  });

  it('returns 429 after 3 calls from same IP in 24h', async () => {
    for (let i = 0; i < 3; i++) {
      await app.inject({ /* ... */ });
    }
    const fourth = await app.inject({ /* ... */ });
    expect(fourth.statusCode).toBe(429);
  });
});
```

### Step 3: Run — fails

```bash
cd /Users/grgurdamiani/Aurate/server && npm test
```
Expected: "POST /aura/rate-guest not registered" or 404s from all tests.

### Step 4: Implement the handler in `server/src/routes/aura.ts`

Sketch (adjust to match the existing route file's conventions):

```ts
import { Redis } from '@upstash/redis';  // already in use for existing limits
const redis = Redis.fromEnv();

// ... alongside the existing /aura/rate handler in the same plugin:
app.post('/aura/rate-guest', {
  schema: {
    body: {
      type: 'object',
      required: ['image_b64', 'sigma_path'],
      properties: {
        image_b64: { type: 'string' },
        sigma_path: { type: 'string' },
      },
    },
  },
}, async (req, reply) => {
  // IP rate limit: 3/day
  const ip = req.ip;
  const key = `guest-rate:${ip}:${new Date().toISOString().slice(0, 10)}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 86_400);
  if (count > 3) return reply.code(429).send({ error: 'rate_limited' });

  // Same Gemini call as /aura/rate, no DB write, no bonus
  const result = await generateAuraRating({
    imageB64: req.body.image_b64,
    sigmaPath: req.body.sigma_path,
  });

  return {
    score: result.score,
    roast: result.roast,
    personality_read: result.personality_read,
    sigma_path: req.body.sigma_path,
  };
});
```

### Step 5: Run — tests pass

```bash
cd /Users/grgurdamiani/Aurate/server && npm test
```
Expected: all new tests green; existing tests unchanged.

### Step 6: Commit

```bash
git add server/src/routes/aura.ts server/src/routes/__tests__/aura.test.ts
git commit -m "feat(server): add /aura/rate-guest endpoint with IP rate limiting (TDD)"
```

---

## Task 2: Create `LensPicker.tsx` component

**Files:**
- Create: `app/src/components/LensPicker.tsx`

### Step 1: Write the component

```tsx
// app/src/components/LensPicker.tsx
import { useRef } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SIGMA_PATHS, type SigmaPathId } from "@/src/constants/paths";
import { COLORS, FONTS, SPACING } from "@/src/constants/theme";

interface LensPickerProps {
  visible: boolean;
  selected: SigmaPathId;
  onSelect: (id: SigmaPathId) => void;
  onClose: () => void;
}

export function LensPicker({ visible, selected, onSelect, onClose }: LensPickerProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <Text style={styles.title}>PICK YOUR LENS</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Stripe divider */}
        <View style={styles.stripe} />

        <ScrollView contentContainerStyle={styles.list}>
          {SIGMA_PATHS.map((path, idx) => {
            const isSelected = path.id === selected;
            return (
              <TouchableOpacity
                key={path.id}
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => {
                  onSelect(path.id);
                  onClose();
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.rowNum, isSelected && { color: COLORS.bg }]}>
                  {String(idx + 1).padStart(2, "0")}
                </Text>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowName, isSelected && { color: COLORS.bg }]}>
                    {path.label.toUpperCase()}
                  </Text>
                  <Text style={[styles.rowDesc, isSelected && { color: COLORS.bg }]}>
                    {path.description}
                  </Text>
                </View>
                {isSelected && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Bottom stripe */}
        <View style={styles.stripe} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerLeft: { width: 32 },
  title: {
    fontFamily: FONTS.display,
    fontSize: 24,
    letterSpacing: 1,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  closeBtn: { width: 32, alignItems: "center" },
  closeBtnText: { fontFamily: FONTS.display, fontSize: 24, color: COLORS.textPrimary },
  stripe: {
    height: 6,
    backgroundColor: COLORS.primary,
  },
  list: { paddingVertical: SPACING.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 88,
  },
  rowSelected: {
    backgroundColor: COLORS.primary,
  },
  rowNum: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    width: 28,
  },
  rowBody: { flex: 1 },
  rowName: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  rowDesc: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    lineHeight: 16,
    marginTop: 4,
  },
  checkMark: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: COLORS.bg,
  },
});
```

### Step 2: Typecheck

```bash
cd /Users/grgurdamiani/Aurate/app && npx tsc --noEmit
```
Expected: clean.

### Step 3: Commit

```bash
git add app/src/components/LensPicker.tsx
git commit -m "feat(app): LensPicker modal component with vertical path list"
```

---

## Task 3: Wire LensPicker into home tab

**Files:**
- Modify: `app/app/(tabs)/index.tsx` around lines 439–483 (the chip scroll + description block)

### Step 1: Replace the chip scroll with a single selection tile + picker state

Add at the top of the component (with existing `useState` hooks):

```ts
const [pickerVisible, setPickerVisible] = useState(false);
```

Replace lines 439–483 (roughly — the `eyebrowRow` "01 / PICK YOUR LENS" block through the `pathDescription` text) with:

```tsx
import { LensPicker } from "@/src/components/LensPicker";
// ...

<View style={styles.eyebrowRow}>
  <View style={styles.eyebrowLine} />
  <Text style={styles.eyebrow}>01 / PICK YOUR LENS</Text>
</View>

{/* Current selection tile — tap to open picker */}
<TouchableOpacity
  style={styles.lensTile}
  onPress={() => setPickerVisible(true)}
  activeOpacity={0.85}
>
  <View style={styles.lensTileHeader}>
    <Text style={styles.lensTileNum}>
      {String(
        SIGMA_PATHS.findIndex((p) => p.id === selectedPath) + 1
      ).padStart(2, "0")}
    </Text>
    <Text style={styles.lensTileName}>
      {SIGMA_PATHS.find((p) => p.id === selectedPath)?.label.toUpperCase() ?? ""}
    </Text>
    <Text style={styles.lensTileChevron}>→</Text>
  </View>
  <Text style={styles.lensTileDesc}>
    {SIGMA_PATHS.find((p) => p.id === selectedPath)?.description ?? ""}
  </Text>
</TouchableOpacity>

<LensPicker
  visible={pickerVisible}
  selected={selectedPath}
  onSelect={handlePathSelect}
  onClose={() => setPickerVisible(false)}
/>
```

### Step 2: Add styles at the bottom of the StyleSheet

Replace the old `pathChip*` styles with:

```ts
lensTile: {
  backgroundColor: COLORS.bgCard,
  borderWidth: 1,
  borderColor: COLORS.border,
  padding: SPACING.md,
  marginTop: SPACING.sm,
},
lensTileHeader: {
  flexDirection: "row",
  alignItems: "center",
  gap: SPACING.sm,
},
lensTileNum: {
  fontFamily: FONTS.mono,
  fontSize: 11,
  color: COLORS.textMuted,
  letterSpacing: 1.2,
},
lensTileName: {
  flex: 1,
  fontFamily: FONTS.display,
  fontSize: 22,
  color: COLORS.textPrimary,
  letterSpacing: -0.3,
},
lensTileChevron: {
  fontFamily: FONTS.display,
  fontSize: 22,
  color: COLORS.textMuted,
},
lensTileDesc: {
  fontFamily: FONTS.mono,
  fontSize: 11,
  color: COLORS.textMuted,
  letterSpacing: 0.8,
  lineHeight: 16,
  marginTop: SPACING.xs,
},
```

Remove: `pathChipsScroll`, `pathChipsRow`, `pathChip`, `pathChipActive`, `pathChipNum`, `pathChipName`, `pathDescription` (now superseded).

### Step 3: Typecheck

```bash
cd /Users/grgurdamiani/Aurate/app && npx tsc --noEmit
```

### Step 4: Commit

```bash
git add app/app/(tabs)/index.tsx
git commit -m "feat(app): replace chip scroll with LensPicker tile + modal on home"
```

---

## Task 4: `guestSession.ts` helper

**Files:**
- Create: `app/src/lib/guestSession.ts`

### Step 1: Write the helper

```ts
// app/src/lib/guestSession.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "guest_uploads_used";

export async function hasUsedFreeUpload(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === "1";
  } catch {
    // Safest fallback: if storage fails, treat as used (no free upload)
    // to avoid hammering the server on a broken device.
    return true;
  }
}

export async function markFreeUploadUsed(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, "1");
  } catch (e) {
    console.warn("markFreeUploadUsed failed:", e);
  }
}

export async function resetGuestState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.warn("resetGuestState failed:", e);
  }
}
```

### Step 2: Typecheck + commit

```bash
cd /Users/grgurdamiani/Aurate/app && npx tsc --noEmit
git add app/src/lib/guestSession.ts
git commit -m "feat(app): guestSession helper — track 1-free-upload flag in AsyncStorage"
```

---

## Task 5: `SignupSheet.tsx` bottom sheet component

**Files:**
- Create: `app/src/components/SignupSheet.tsx`

### Step 1: Write the component

```tsx
// app/src/components/SignupSheet.tsx
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, FONTS, SPACING } from "@/src/constants/theme";

interface SignupSheetProps {
  visible: boolean;
  message: string;
  onClose: () => void;
}

export function SignupSheet({ visible, message, onClose }: SignupSheetProps) {
  const goSignup = () => {
    onClose();
    router.push("/auth/signup" as never);
  };
  const goSignin = () => {
    onClose();
    router.push("/auth/signin" as never);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={["bottom"]}>
            <View style={styles.handle} />
            <Text style={styles.title}>⚠ SIGN UP TO CONTINUE</Text>
            <Text style={styles.body}>{message}</Text>

            <TouchableOpacity style={styles.primary} onPress={goSignup} activeOpacity={0.85}>
              <Text style={styles.primaryText}>CREATE ACCOUNT →</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondary} onPress={goSignin} activeOpacity={0.7}>
              <Text style={styles.secondaryText}>Already have one? SIGN IN →</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  handle: {
    alignSelf: "center",
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: COLORS.textPrimary,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  body: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  primary: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  primaryText: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.bg,
    letterSpacing: 1,
  },
  secondary: {
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  secondaryText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
});
```

### Step 2: Typecheck + commit

```bash
cd /Users/grgurdamiani/Aurate/app && npx tsc --noEmit
git add app/src/components/SignupSheet.tsx
git commit -m "feat(app): SignupSheet bottom sheet for guest gates"
```

---

## Task 6: Add `rateAuraGuest()` to api.ts

**Files:**
- Modify: `app/src/lib/api.ts`

### Step 1: Inspect the existing `rateAura` helper

Read current `api.ts` to match the existing function signature + return shape.

### Step 2: Add the guest variant

Add alongside the existing `rateAura`:

```ts
export async function rateAuraGuest(params: {
  imageB64: string;
  sigmaPath: string;
}): Promise<{
  score: number;
  roast: string;
  personality_read: string;
  sigma_path: string;
}> {
  const res = await fetch(`${API_URL}/aura/rate-guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_b64: params.imageB64,
      sigma_path: params.sigmaPath,
    }),
  });
  if (res.status === 429) {
    throw new Error("rate_limited");
  }
  if (!res.ok) {
    throw new Error(`Guest rate failed: ${res.status}`);
  }
  return await res.json();
}
```

Note: no `Authorization` header; guest endpoint is unauthenticated.

### Step 3: Typecheck + commit

```bash
cd /Users/grgurdamiani/Aurate/app && npx tsc --noEmit
git add app/src/lib/api.ts
git commit -m "feat(app): add rateAuraGuest() — unauthed /aura/rate-guest call"
```

---

## Task 7: `authStore.signUp` calls `resetGuestState()`

**Files:**
- Modify: `app/src/store/authStore.ts`

### Step 1: Import + call

At the top of `authStore.ts`, add:

```ts
import { resetGuestState } from "@/src/lib/guestSession";
```

In the `signUp` handler, AFTER the successful `supabase.auth.signUp` call (before or after `fetchProfile`):

```ts
await resetGuestState();
```

Wrap in try/catch if you want the sign-up flow to succeed even if AsyncStorage misbehaves — but the `resetGuestState` implementation already swallows errors internally.

### Step 2: Typecheck + commit

```bash
cd /Users/grgurdamiani/Aurate/app && npx tsc --noEmit
git add app/src/store/authStore.ts
git commit -m "feat(app): clear guest state on signup"
```

---

## Task 8: Remove `!user → /auth/signup` route guard

**Files:**
- Modify: `app/app/_layout.tsx` around lines 210–234

### Step 1: Update the route guard effect

Replace the body of the route-guard `useEffect`:

```ts
/* Route guard */
useEffect(() => {
  if (!authReady || onboardingComplete === null) return;

  const inAuthGroup = segments[0] === "auth";
  const inOnboarding = segments[0] === "onboarding";

  try {
    // Everyone (guest or authed) must complete onboarding first
    if (!onboardingComplete) {
      if (!inOnboarding) {
        router.replace("/onboarding");
      }
      return;
    }

    // Authed users should not linger on auth screens
    if (user && inAuthGroup) {
      router.replace("/(tabs)");
      return;
    }

    // Anyone who has finished onboarding should not linger on onboarding
    if (inOnboarding) {
      router.replace("/(tabs)");
    }
  } catch (e) {
    console.warn("Route guard navigation failed:", e);
  }
}, [user, authReady, onboardingComplete, segments]);
```

### Step 2: Test manually (typecheck only for now)

```bash
cd /Users/grgurdamiani/Aurate/app && npx tsc --noEmit
```

### Step 3: Commit

```bash
git add app/app/_layout.tsx
git commit -m "feat(app): remove hard signup gate — allow guests past the route guard"
```

---

## Task 9: Branch aura submission on auth in home tab

**Files:**
- Modify: `app/app/(tabs)/index.tsx`

### Step 1: Import helpers + auth state

```ts
import { useAuthStore } from "@/src/store/authStore";
import { hasUsedFreeUpload, markFreeUploadUsed } from "@/src/lib/guestSession";
import { rateAura, rateAuraGuest } from "@/src/lib/api";
import { SignupSheet } from "@/src/components/SignupSheet";
```

Add state at top of the component:

```ts
const user = useAuthStore((s) => s.user);
const [signupSheetVisible, setSignupSheetVisible] = useState(false);
```

### Step 2: Gate the photo action

Before the existing `takePhoto` / `pickImage` handlers run, check guest status:

```ts
const startAuraFlow = async (imageSource: () => Promise<string | null>) => {
  // Guest check: if no user and guest already used their free upload → gate
  if (!user) {
    const used = await hasUsedFreeUpload();
    if (used) {
      setSignupSheetVisible(true);
      return;
    }
  }
  const imageB64 = await imageSource();
  if (!imageB64) return;  // user cancelled

  try {
    let result;
    if (user) {
      result = await rateAura({ imageB64, sigmaPath: selectedPath });
    } else {
      result = await rateAuraGuest({ imageB64, sigmaPath: selectedPath });
      await markFreeUploadUsed();
    }
    // Pass `result` into the existing result-display logic
    // (match whatever the current onSuccess path does)
  } catch (e: any) {
    if (e?.message === "rate_limited") {
      setError("Too many tries — come back tomorrow or sign up.");
      return;
    }
    setError(getBrainrotError(e?.message || ""));
  }
};
```

The exact integration depends on the existing `takePhoto` / `pickImage` code. The principle: replace direct `rateAura` calls with this branched helper.

### Step 3: Render the signup sheet at bottom of JSX

```tsx
<SignupSheet
  visible={signupSheetVisible}
  message="Save your aura, hit the leaderboard, mog your friends."
  onClose={() => setSignupSheetVisible(false)}
/>
```

### Step 4: Handle the "SAVE YOUR AURA — SIGN UP" banner below the result card for guests

In whatever component renders the result card on this screen, if `!user`, append a CTA banner that opens the signup sheet (or navigates to `/auth/signup` directly).

### Step 5: Typecheck + commit

```bash
cd /Users/grgurdamiani/Aurate/app && npx tsc --noEmit
git add app/app/(tabs)/index.tsx
git commit -m "feat(app): gate camera behind 1-free-upload for guests; wire SignupSheet"
```

---

## Task 10: Guest empty state for Your Aura tab

**Files:**
- Modify: `app/app/(tabs)/your-aura.tsx`

### Step 1: At the top of the component, branch on auth

```tsx
import { useAuthStore } from "@/src/store/authStore";
// ...
const user = useAuthStore((s) => s.user);

if (!user) {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🌀</Text>
        <Text style={styles.emptyTitle}>SIGN UP TO TRACK YOUR AURA</Text>
        <Text style={styles.emptyBody}>
          Your history, streaks, and tier live here. Create an account to start.
        </Text>
        <TouchableOpacity
          style={styles.emptyCta}
          onPress={() => router.push("/auth/signup" as never)}
          activeOpacity={0.85}
        >
          <Text style={styles.emptyCtaText}>CREATE ACCOUNT →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ...existing authed render path unchanged
```

Add minimal styles for `emptyState`, `emptyIcon`, `emptyTitle`, `emptyBody`, `emptyCta`, `emptyCtaText`. Match the brutalist palette (hazard yellow button on ink bg).

### Step 2: Typecheck + commit

```bash
cd /Users/grgurdamiani/Aurate/app && npx tsc --noEmit
git add app/app/(tabs)/your-aura.tsx
git commit -m "feat(app): guest empty state on Your Aura tab"
```

---

## Task 11: Guest empty state for Battles tab

**Files:**
- Modify: `app/app/(tabs)/battles.tsx`

Same pattern as Task 10 — branch on `user`, render empty state for guests, leave authed path unchanged.

Headline: `SIGN UP TO CHALLENGE FRIENDS`
Body: `Battle friends. See who mogged harder. Needs an account.`

```bash
cd /Users/grgurdamiani/Aurate/app && npx tsc --noEmit
git add app/app/(tabs)/battles.tsx
git commit -m "feat(app): guest empty state on Battles tab"
```

---

## Task 12: Gate Mog Board profile taps for guests

**Files:**
- Modify: `app/app/(tabs)/mogboard.tsx` (or wherever the leaderboard renders)

### Step 1: Wrap profile-opening tap handlers

Guest still sees the leaderboard (it's public data). But tapping any row to view a user's profile or send a battle should open SignupSheet:

```tsx
const user = useAuthStore((s) => s.user);
const [signupSheetVisible, setSignupSheetVisible] = useState(false);

const handleRowTap = (profileId: string) => {
  if (!user) {
    setSignupSheetVisible(true);
    return;
  }
  // existing navigate-to-profile logic
};

// In JSX, at the bottom:
<SignupSheet
  visible={signupSheetVisible}
  message="Tap in to see who's behind the score."
  onClose={() => setSignupSheetVisible(false)}
/>
```

### Step 2: Typecheck + commit

```bash
cd /Users/grgurdamiani/Aurate/app && npx tsc --noEmit
git add app/app/(tabs)/mogboard.tsx
git commit -m "feat(app): gate Mog Board profile taps behind signup for guests"
```

---

## Task 13: Final end-to-end typecheck and manual QA checklist

### Step 1: Final typecheck on both projects

```bash
cd /Users/grgurdamiani/Aurate/app && npx tsc --noEmit
cd /Users/grgurdamiani/Aurate/server && npx tsc --noEmit
cd /Users/grgurdamiani/Aurate/server && npm test
```
All three must be clean/green.

### Step 2: User-action checklist (user does this before EAS build)

- [ ] Deploy server to Railway (pushes auto-deploy; verify `/aura/rate-guest` responds with 400 to empty body, 200 to valid body)
- [ ] Confirm Upstash Redis env vars are set on Railway (they should already be since rate limiting for signed-in flow is in place)

### Step 3: EAS build + submit

```bash
cd /Users/grgurdamiani/Aurate/app
eas build --platform ios --profile production --auto-submit
```

(This is the build that was blocked earlier by the push notifications provisioning profile issue — confirm that was resolved via `eas credentials` first.)

### Step 4: Manual QA on TestFlight (new build installed)

- [ ] Fresh install (or delete + reinstall) the app
- [ ] Complete onboarding → land on home WITHOUT being prompted to sign up
- [ ] Tap Your Aura → see `SIGN UP TO TRACK YOUR AURA` empty state
- [ ] Tap Battles → see `SIGN UP TO CHALLENGE FRIENDS` empty state
- [ ] Tap Mog Board → leaderboard renders; tap any row → SignupSheet appears
- [ ] Tap Vibe Check → tap PICK YOUR LENS tile → modal opens with 7 paths
- [ ] Tap a path in modal → modal closes, home tile updates
- [ ] Tap Get Cooked → camera opens → take photo → aura result renders (ephemeral)
- [ ] Tap Get Cooked again → SignupSheet appears (no camera)
- [ ] Tap CREATE ACCOUNT → signup flow → after signup, camera flow works (authed path)
- [ ] After signup, take a photo → rating persists in Your Aura

---

## Follow-ups (out of scope for this plan)

- Persist guest's free rating into first aura_check row on signup (Option C from design — requires anon session tracking + merge flow)
- Device fingerprinting to prevent uninstall/reinstall bypass
- App-side Vitest + RNTL test infra (still tracked from earlier audit)
- Consolidate existing `rateAura` + `rateAuraGuest` helpers if duplication grows
