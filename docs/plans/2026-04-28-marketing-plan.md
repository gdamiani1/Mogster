# Mogster — Marketing Plan (v1, pre-launch through M3)

**Date:** 2026-04-28
**Status:** Draft for investor conversations
**Author:** Grgur (founder) + Claude
**Time horizon:** Now (pre-launch, ~100 TestFlight testers) → M3 (3 months post-public-launch)
**Budget:** €75K growth allocation (per [decision-100k-angel-round](../../Memory/decisions/decision-100k-angel-round.md), includes €18K marketing hire)

---

## Why this exists

Every consumer-AI seed deck in 2026 has a moat slide and a GTM slide. Mogster's moat is solid (see [knowledge-moats.md](../../Memory/knowledge/knowledge-moats.md)) — Gen-Z native voice, AI rating + battles + leaderboard composition is non-trivial to copy in less than 3 months, and the brand vocabulary moat is real. The GTM has been verbal and missing from the written record. This plan fills that gap.

This is **not** a launch announcement plan. Mogster is in TestFlight with ~100 testers; public launch targets Q3 2026 ([project-mogster.md](../../Memory/projects/project-mogster.md)). The plan covers:
1. **Pre-launch (now → public launch)** — waitlist conversion, content seeding, TestFlight cohort building
2. **Launch (M0–M1)** — App Store push, creator seeding, the marketing hire's first 30-day plan
3. **Growth (M1–M3)** — paid acquisition gated by K-factor, retention loops, second-cohort onboarding

Every claim in this doc maps to the kill criteria in [project-mogster.md](../../Memory/projects/project-mogster.md): D30 > 15%, free→paid > 1.5%, K-factor > 0.6 organic. If we miss those, no marketing budget rescues the product.

---

## 1. Audience map

### Primary: Gen Z 16–22, TikTok-native, brainrot-fluent

The actual user is not "Gen Z" generically — it's a sub-segment within Gen Z who already lives inside specific vocabulary and meme cycles.

| Sub-persona | What they share | Why Mogster fits |
|---|---|---|
| **Looksmaxxing-curious** | Watches lookspmax / mewing / "Astralized" content. Searches "how to mog." Ages 16–20 mostly male-presenting, but expanding female. | Mogster is the entry-level looksmaxxing app that's *fun* — not the "12-step morning routine" rabbit hole. |
| **Brainrot-fluent** | Communicates primarily via TikTok memes — "skibidi", "ohio", "rizz", "delulu". Ages 14–22, gender-balanced, terminally online. | Mogster speaks their first language. The roast IS the content. |
| **Aesthetic Gen Z** | Identifies with categories: clean girl, old money, baddie, slay. Has Pinterest boards. Female-skewing 17–24. | The 12-lens system (W3) gives them their aesthetic as a scoring lens. |
| **Sigma / mogger** | Watches Patrick Bateman edits unironically. Ages 16–20, male-presenting. Stoic-grindset coded. | Sigma Grindset and Mogger Mode are calibrated to this audience; they are NOT a parody of it (they're affectionate). |
| **Group-chat clown** | The friend in every group chat who screenshots and forwards. Cross-segment. | The card is the artifact. Their identity at the table = sharing what other apps produced. |

### Anti-persona (not for Mogster)
- People who want a "wellness check"
- People offended by Gen-Z slang
- People over 35 who would say "this is mean"
- Anyone under 16 (legally — the DOB gate enforces this)

### Geography
- **Tier 1**: US, UK — TikTok-mature markets, English-native, App Store strong
- **Tier 2**: Croatia, Germany, Netherlands, Nordics — founder is in Croatia, network effects start at home
- **Tier 3 (deferred)**: Brazil, Indonesia, India — high TikTok usage but localization (and roast voice) is hard

Launch focus = Tier 1 + Croatia (founder's network gives initial seed). Tier 2 expansion at M2.

---

## 2. Pre-launch (now → public launch ~Q3 2026)

**Goal:** convert the existing waitlist + recruit a high-quality TestFlight cohort that produces D7 + D30 retention signal worth pitching.

### Status now
- Waitlist exists at mogster.app (form live, capturing emails)
- TestFlight: ~100 testers across Gen Z / Millennial / Gen X
- D7 retention: 30% baseline (per project-mogster)
- D30: not yet measured — cohort too young
- Public launch: Q3 2026

### Pre-launch workstream (8–10 weeks)

| Week | Action | KPI |
|---|---|---|
| W1–2 | Ship moderation v1 (DONE), W2 (lens picker + guest mode), fix lens-chip bug (DONE) | Build is App-Store-submittable |
| W2–3 | Recruit second TestFlight cohort: 200 more, weighted Gen Z 16–22 | TestFlight = 300 testers |
| W3–4 | Daily organic TikTok content (founder POV, "I'm building this app") | 10K cumulative views |
| W3–6 | Seed 10 micro-creators (5K–50K followers) with TestFlight access | 5/10 produce content |
| W4–6 | W3 (5 new lenses) + W6 (PostHog) ship; D7 telemetry stable | D7 ≥ 25%, K-factor measurement begins |
| W6–8 | Waitlist email sequence: 4-touch drip (build excitement, not promotional) | 60% of waitlist opens email 1 |
| W8–10 | App Store submission + review buffer; press kit assembled | Approved for launch window |

### Content cadence (founder-driven, until marketing hire lands)

**Daily**: 1 TikTok per day, founder POV
- Content pillars (rotate): build-in-public ("just shipped X"), behind-the-scenes (the moderation system, the brutal roast prompts), tester reactions, lens-of-the-day
- Posted from `@mogster.app` handle
- Goal: 100K cumulative views by W6, 250K by W10

**Weekly**: 1 longer-form piece
- Threads on X (formerly Twitter): "Why I'm building Mogster," "How the AI learned to roast," "The ethics of looksmaxxing apps"
- Goal: build the founder narrative for press / investors / future hires

**Reactive**: 1 roast video per relevant TikTok trend
- When a "rate me" or "looksmax me" trend hits, post a Mogster-flavored response
- Borrow attention from the trend, plant the brand

### Waitlist conversion strategy

Currently mogster.app has a single "lock me in" form. Plan:

| Touch | Channel | Content | Goal |
|---|---|---|---|
| Day 0 | Email | "You're locked in." Confirmation. Brand voice. | Set tone, prevent unsub |
| Day 14 | Email | "What we're cooking." Behind-the-scenes update on shipped features. | Re-engage |
| Day 28 | Email | "First look." TestFlight invite for committed early waitlist. | Promote 10–20% to TestFlight |
| Day 56 | Email | "Almost." App Store launch date confirmed. | Re-warm before launch |
| Launch day | Email | "It's open." Direct App Store link. | Convert |

Production: write all 5 emails NOW; queue via Resend or Postmark, not Mailchimp (Mailchimp ages users badly and the brand voice deserves a clean transactional sender).

### TestFlight cohort recruitment

Don't recruit randomly. Recruit by behavior:

| Source | Filter | Target N |
|---|---|---|
| Waitlist (~current N) | Top 30% by signup recency | 100 |
| Founder's network | Direct invites to Gen Z relatives + Croatian university contacts | 50 |
| Reddit r/mogging, r/looksmaxxing | Curated DM after meaningful comment thread engagement | 50 |
| TikTok comments | Reply to "rate me" videos with TestFlight invites | 100 |

Target: 300-tester pool at public launch. Run 4 cohort waves of 50–75 with feature-set checkpoints.

### Pre-launch budget allocation

**Total: €0 in the first 8 weeks.** Founder-led organic only. The €18K marketing hire and €40K paid budget are for post-launch.

This isn't being broke — it's being **disciplined**. Paid acquisition before K-factor is proven loses you money, regardless of how much you have. See section 5 for the gating rule.

---

## 3. Launch phase (M0–M1, App Store live)

**Goal:** 10K installs in M0, with healthy enough retention to justify any paid spend in M1.

### Day-of-launch checklist

- [ ] Press kit live at mogster.app/press (one-pager, screenshots, founder bio, brand assets)
- [ ] App Store listing optimized (subtitle, keywords, screenshots — see `knowledge-app-store-metadata.md`)
- [ ] TestFlight cohort emailed: "Drop your launch-day card, tag @mogster.app on TikTok"
- [ ] Founder posts launch-day TikTok at 9am ET (Gen-Z peak)
- [ ] X thread: "Mogster is live. Here's what shipped, here's what didn't, here's what's next."
- [ ] Product Hunt submission (Tuesday or Wednesday for highest discovery)
- [ ] Reddit posts in r/mogging, r/looksmaxxing, r/genz (read each sub's rules first; non-promotional framing)

### M0 (week 1) — install push

| Channel | Action | Cost | Target |
|---|---|---|---|
| TikTok organic | Daily founder content + 3-5 "tester showcase" videos | €0 | 50K cumulative views |
| Creator seed | 10 creators (5K–50K) post launch-day cards | €0 (free TestFlight access already given) | 5 visible posts |
| Product Hunt | Submission + community engagement | €0 | Top 10 of the day |
| Reddit | 3 thoughtful posts (NOT spammy launch announcements) | €0 | 100 cumulative comments |
| Press | Pitch The Verge, TechCrunch, 404 Media — looksmaxxing angle | €0 | 1 press hit |
| Waitlist conversion | Launch-day email | Already paid | 30% → install |

**M0 install target: 5K–10K.** Highly dependent on TikTok pickup. If a single tester video hits 1M views, this number explodes; baseline is conservative.

### M1 (weeks 2–4) — first paid experiments

This is where the marketing hire enters.

#### The marketing hire (~€1,500/mo, part-time)

**Profile**: Gen-Z TikTok native (18–24), already runs a personal account with 10K+ followers in adjacent space (looksmaxxing, beauty, gaming). NOT an "agency" or "consultant." Someone who *is* the audience.

**Where to find**:
- Twitter/X: post a hire ad in the founder's network, gated by "send me your TikTok"
- Croatian universities (CESI, FER, etc.) — local talent reduces management overhead
- Reddit r/CalledToCommunism (jokey but has the right culturally-online demographic)

**First 30 days**:
- Take over `@mogster.app` TikTok account from founder
- Bump cadence from 1/day to 3/day (with founder still doing 2/week of "build in public")
- Run 2 paid TikTok campaigns: €500 each, A/B testing creator collabs vs. UGC-style ads
- Identify 5 micro-creators (50K–200K) for paid partnership ($200–500/post)

**KPI**: 50K → 250K total install funnel by M1 end.

#### M1 paid experiments (gated)

**€2K total budget for M1 paid spend.** Split:
- €1K — TikTok Ads Manager, 3-day creative tests
- €500 — Reddit promoted posts in target subs
- €500 — Influencer micro-partnership (1 creator at $400/post)

**Gate**: do NOT spend any paid until M0 organic confirms K-factor > 0.4. If K < 0.4 in M0, fix the product, don't pay for installs.

---

## 4. Growth phase (M1–M3)

**Goal:** 50K installs by end of M3, K-factor sustained > 0.6, free→paid > 1.5% within 14 days post-install.

### Channel mix (M2–M3)

| Channel | Weight | Why |
|---|---|---|
| TikTok organic | 40% | Brand-native; Mogster's sharing loop literally produces TikTok content |
| TikTok paid | 25% | Use proven creators from M1; spend up only after K > 0.6 confirmed |
| Creator partnerships | 15% | Move from micro (50K) to mid-tier (200K–1M) creators with paid deals |
| Press / earned | 10% | The looksmaxxing-app angle has a press cycle waiting |
| Reddit / Discord | 5% | Communities matter for retention, not first-touch; play long |
| Product Hunt / X | 5% | Tail of M0 surge |

### The retention loops

Distribution dies without retention. Mogster's three loops:

#### Loop 1: Daily challenges (engagement)
- Mogger Monday (1.5×) and Wildcard Wednesday (2.0×) already shipped
- Add: rotating weekly themes (Slay Saturday, Brainrot Friday)
- Push notification at 11am local time — challenge announcement
- Goal: drive D1 → D7 retention from 30% to 45%

#### Loop 2: Battles (virality)
- 1v1 friend battles — already shipped
- Add: "Battle of the Week" — featured battle on the home tab
- Add: Public battle requests (open challenge to anyone on the leaderboard) — opt-in
- Goal: K-factor 0.6 → 0.8 by M3

#### Loop 3: The card (acquisition)
- The screenshotable result card IS the ad
- Optimize the card design (W4 visual refresh) for vertical-share contexts
- Add a watermark on free-tier cards: "@mogster.app" in mogster's voice
- Goal: 30% of users share at least 1 card in first 7 days

### The paid acquisition gate

**Critical:** do not exceed €5K/mo on paid acquisition until K-factor sustains > 0.6 organic.

Reasoning (with numbers):
- LTV at €4/mo subscription, 8-month average retention = €32/user
- Industry CAC for Gen-Z consumer apps via TikTok ads: €4–8 per install, €40–120 per paid subscriber
- At K = 0.4: every paid install brings 0.4 organic. Effective CAC = paid / (1 + K) ≈ 0.71× listed CAC. Doesn't beat LTV at €4/mo with 1.5% conversion.
- At K = 0.6: effective CAC = 0.625× listed. Now beats LTV.
- At K = 0.8: effective CAC = 0.55×. Strongly profitable.

**Translated**: every euro of paid spend before K = 0.6 is being inefficiently used. Wait.

### Press strategy

Three press windows:
1. **Launch day** — Verge / TechCrunch / 404 Media. Looksmaxxing-app-with-moderation angle.
2. **M2** — Profile / interview piece. "Solo founder shipped a Gen-Z app from Croatia." Press loves this story.
3. **M3 (if metrics earn it)** — TechCrunch / Hacker News pitch on virality numbers, "this is how you do consumer AI right" angle.

Pitch lists:
- Tier 1: Verge, TechCrunch, 404 Media, The Information
- Tier 2: Mashable, Mic, Insider, Brut.
- Tier 3 (Croatia/EU): Bug.hr, Index.hr, t-portal.hr, EU-Startups, Sifted

Story angles to lead with:
- "How we built a roast app that doesn't ruin teens" (moderation)
- "The 12 lenses of looksmaxxing — Mogster maps Gen Z aesthetic culture"
- "Solo Croatian founder, $0 marketing, [X] users in [Y] weeks"
- "Why we said no to ads on a teen app" (subscription-first thesis — see [decision-sub-first-monetization](../../Memory/decisions/decision-sub-first-monetization.md))

---

## 5. Funnel & metrics

End-to-end funnel with target rates:

```
App Store Discovery
    ↓ (3% click→install on listing page, search-driven)
Install
    ↓ (75% complete onboarding)
Onboarding complete
    ↓ (90% take first selfie within 3 days)
First rating
    ↓ (45% share or save first card)
First share
    ↓ (60% return Day 1)
D1 retention
    ↓ (50% return Day 7)
D7 retention
    ↓ (40% return Day 30)
D30 retention   [KILL CRITERION: > 15%]
    ↓ (1.5% subscribe to Cookbook within 14 days)
Subscription   [KILL CRITERION: free→paid > 1.5%]
    ↓ (8 mo average retention)
Lifetime
```

### What W6 (analytics) needs to capture

PostHog event schema:
- `app_open` (with cold/warm distinction)
- `onboarding_complete`
- `aura_rated` (with sigma_path, score, tier, was_daily_challenge)
- `card_shared` (with platform — system share / TikTok / Instagram / save)
- `battle_created`, `battle_accepted`, `battle_completed`
- `paywall_shown` (when, why)
- `paywall_dismissed`, `cookbook_purchased`
- `moderation_rejected` (with copy_tier, hidden from product but tracked)
- `friend_added`, `friend_request_sent`, `friend_request_accepted`

Funnel reports needed:
- Acquisition by source
- Time-to-first-rating (target < 3 min)
- Day-N retention curves (D1, D7, D14, D30)
- Free→paid conversion (14-day cohort)
- K-factor (invites sent / installs caused)

Plot all of these on a single PostHog dashboard. Bookmark the URL. Investors get this link in the warm-conversation phase.

---

## 6. Budget & sequencing

### Total marketing spend: €58K over 18 months

(Per [knowledge-use-of-funds.md](../../Memory/knowledge/knowledge-use-of-funds.md): €75K growth bucket = €18K marketing hire + €57K direct marketing budget)

| Phase | Months | Spend | Channels |
|---|---|---|---|
| Pre-launch | M-3 to M0 | €0 | Founder-led organic only |
| M0 launch | M0 | €0 | Organic + earned + creator-seeded |
| M1 (gate) | M1 | €2K | Test paid TikTok + Reddit + 1 creator partner |
| M2–M3 (growth) | M2–M3 | €15K | Scale to €5K/mo if K > 0.6 |
| M4–M9 | M4–M9 | €36K | €6K/mo sustained, gated on retention |
| M10–M18 | M10–M18 | €5K | Tail / re-engagement campaigns |

### Marketing hire timeline

- Hire month: M-1 (one month before public launch)
- Type: Part-time contractor, €1,500/mo (€18K/yr)
- Term: 12 months, renewal based on attribution metrics

### Spend gates (non-negotiable)

| Gate | Action |
|---|---|
| K < 0.4 | No paid spend. Fix product. |
| K 0.4–0.6 | €2K/mo cap, learn-mode only |
| K 0.6–0.8 | €5K/mo, scale measured |
| K > 0.8 | €10K+/mo, growth mode |
| D30 < 10% | Halt all paid, reassess product |
| Free→paid < 0.5% | Halt paywall changes, reassess pricing |

---

## 7. Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| TikTok shadow-ban or algorithm shift | Medium | High | Diversify to X, Reddit, Instagram early — don't be 100% TikTok |
| App Store rejection (looksmaxxing moral panic) | Medium | High | Moderation v1 already shipped; 13+ rating defensible; have appeals plan ready |
| K-factor stays under 0.4 | Medium | Critical | Don't paper over with paid. Ship product changes (better card design, easier share, more share-prompts in funnel) |
| Negative press (teen body image angle) | Medium | Medium | Be transparent about moderation; have a researcher/clinician advisor who can speak to it |
| Marketing hire underperforms | Medium | Medium | Month-2 attribution checkpoint; replace by month 4 if not delivering |
| Competitor copies | High | Low–Medium | Brand vocabulary moat is real but not infinite; ship faster on retention features (battles, daily challenges, lens additions) |
| Founder bandwidth | High | High | The marketing hire is partly insurance against this; shipping discipline matters more than marketing volume |
| Croatia-distance from Gen-Z markets | Low | Low | Internet is internet; founder can post in English. Timezone mostly aligns with EU launch markets. |

---

## 8. What to track weekly

The 5-metric dashboard that drives decisions:

| Metric | Target | Action threshold |
|---|---|---|
| Weekly installs | 5K → 10K → 25K → 50K | Below trajectory by 30%: reassess channel mix |
| Weekly active users (WAU) | (varies — track ratio to MAU) | WAU/MAU < 0.4: retention problem, not acquisition |
| K-factor (rolling 7-day) | 0.6+ | < 0.4: pause paid, fix loops |
| Free→paid conversion (14-day cohort) | > 1.5% | < 1.0%: paywall + Cookbook value prop work |
| D30 retention (rolling cohort) | > 25% | < 15%: kill criterion territory |

Reviewed every Monday. Decisions made by Wednesday based on the data.

---

## 9. What this plan deliberately doesn't do

- **No influencer marketplace deals** (Aspire, Grin, etc.) at v1 — too generic, kills brand voice. Direct creator outreach only.
- **No Apple Search Ads** until M3+ — branded search isn't enough volume; non-branded competes against established apps.
- **No SEO content marketing** — Mogster's audience doesn't Google, they TikTok-search.
- **No email newsletter beyond launch sequence** — adds 0 retention to a Gen-Z mobile app.
- **No "growth hacks"** — referral codes, viral spam, fake-scarcity drops. Brand integrity > short-term spike.
- **No Twitter/X paid promotion** — weak for Gen-Z; founder uses it for narrative, not acquisition.

---

## 10. Investor talking points (extracted from this plan)

For warm conversations and the deck GTM slide:

1. **"€0 marketing budget pre-launch — and that's the discipline, not the constraint."** Founder-led TikTok content + creator seeding. Paid acquisition gated on K > 0.6 organic.
2. **"Three retention loops, not a funnel."** Daily challenges (engagement), Battles (virality), the Card (acquisition). All three already shipped.
3. **"Card-as-ad."** Every result card is a TikTok-shareable artifact. Free-tier watermark turns every share into an install ad. Estimated organic CAC: €0 if K stays > 0.6.
4. **"Paid spend isn't a growth lever, retention is."** Every euro before K = 0.6 is leakage. Math (in section 4) supports it.
5. **"The marketing hire is a TikTok native, not an agency."** €18K/yr part-time. Replaceable at month 4 with a 30-day attribution check.
6. **"Press has a launch story we don't need to manufacture."** Solo Croatian founder, looksmaxxing-with-moderation, sub-first-no-ads. All real, all interesting, all defensible.

---

## Sequencing summary

```
Now              W1: vault + this plan (DONE)
                 W2: lens picker + guest mode (4-6d)
                 Marketing hire scouting begins
                 Email queue built (5 waitlist touches)
                 W6: analytics ships (2d) — must precede paid spend
                 W3: 5 new lenses (3-4d)
                 W4: visual refresh (3-4d, single direction)
M-1              Marketing hire onboarded
                 W5: Cookbook paywall (5-7d)
                 Press kit live
                 TestFlight cohort 2 + 3
M0 (launch)      App Store live
                 Launch-day TikTok + email + Reddit + PH
                 €0 paid spend
                 Daily organic content
M1               First paid experiments (€2K)
                 K-factor measurement → gate decision
M2–M3            Scale paid if K > 0.6
                 Press cycle 2 (profile pieces)
                 Hit 50K installs
M4–M9            Sustained €6K/mo, gated on retention
                 Press cycle 3 (if numbers warrant)
                 Approach seed round at €1M ARR mark
```

---

## Open items / things to revisit

- Final marketing hire JD + posting plan — do this in M-2
- Resend / Postmark account setup for transactional email — do this immediately, costs ~€20/mo at launch volume
- Brand asset kit (press-ready logo files, screenshots, founder photo) — needs the visual refresh from W4 first
- Crisis communication plan — what to say if a moderation failure goes viral; not urgent, but write it before launch
- Localization roadmap — which Tier 2 markets get translated first, when

---

## Approval

**Approved by:** Grgur, 2026-04-28
**Iterates:** Quarterly. Plan updates after M0 launch with real numbers replacing estimates.
**Related:**
- [knowledge-moats.md](../../Memory/knowledge/knowledge-moats.md)
- [knowledge-pitch-qa-prep.md](../../Memory/knowledge/knowledge-pitch-qa-prep.md)
- [knowledge-use-of-funds.md](../../Memory/knowledge/knowledge-use-of-funds.md)
- [project-mogster.md](../../Memory/projects/project-mogster.md) — kill criteria
