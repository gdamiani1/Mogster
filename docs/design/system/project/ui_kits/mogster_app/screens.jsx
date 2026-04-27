/* global React */
const { useState } = React;

/* ───────────────────────────── shared bits ───────────────────────────── */

function Eyebrow({ num, label, color }) {
  return (
    <div className="eyebrow-row">
      <div className="eyebrow-rule" style={color ? { background: color } : null} />
      <div className="eyebrow-text" style={color ? { color } : null}>
        {num ? `── ${num} / ` : "── "}{label}
      </div>
    </div>
  );
}

function Wordmark({ size = 24, color = "var(--paper)" }) {
  return (
    <span style={{ fontFamily: "var(--font-display)", fontSize: size, lineHeight: 0.85, letterSpacing: "-0.02em", color, textTransform: "uppercase", paddingTop: size * 0.12 }}>
      MOGSTER<span style={{ color: "var(--hazard)" }}>.</span>
    </span>
  );
}

function TabBar({ active }) {
  const items = [
    { key: "rate", glyph: "◉", label: "RATE" },
    { key: "board", glyph: "△", label: "BOARD" },
    { key: "battle", glyph: "⚔", label: "BATTLE" },
    { key: "you", glyph: "●", label: "YOU" },
  ];
  return (
    <div className="tabbar">
      {items.map(it => (
        <div key={it.key} className={"tabbar-item " + (it.key === active ? "active" : "")}>
          <div className="tabbar-glyph">{it.glyph}</div>
          <div>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

function StatusStrip({ right }) {
  return (
    <div className="status-strip">
      <span>ISSUE N°01</span>
      <span>{right || "AURA STATION"}</span>
    </div>
  );
}

/* placeholder photo as gradient + grain */
function PortraitFill({ tone = "cool", radial = false, children }) {
  const bg = radial
    ? "radial-gradient(circle at 50% 35%, #FFD60A 0%, #FF6B00 35%, #1A0000 80%)"
    : tone === "warm"
      ? "linear-gradient(180deg, #6b5a4a 0%, #2a221a 70%, #0A0A0A 100%)"
      : "linear-gradient(180deg, #5a5a5a 0%, #2a2a2a 70%, #0A0A0A 100%)";
  return (
    <div style={{ position: "absolute", inset: 0, background: bg }}>
      <div className="grain-overlay" />
      {children}
    </div>
  );
}

/* ───────────────────────────── 01 — splash ──────────────────────────── */

function Splash() {
  return (
    <div className="phone-bg">
      <div className="grain-overlay" />
      <StatusStrip right="04.28.26" />

      {/* hazard tape stripe top */}
      <div style={{ position: "absolute", top: 90, left: 0, right: 0, height: 18, backgroundImage: "repeating-linear-gradient(45deg, var(--ink) 0 10px, var(--hazard) 10px 20px)" }} />

      {/* big wordmark center */}
      <div style={{ position: "absolute", top: 220, left: 24, right: 24 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 92, lineHeight: 0.85, letterSpacing: "-0.03em", color: "var(--paper)", textTransform: "uppercase", paddingTop: 12 }}>
          MOG<br />STER<span style={{ color: "var(--hazard)" }}>.</span>
        </div>
        <div style={{ marginTop: 18, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--paper-mute)", lineHeight: 1.5 }}>
          your aura. rated. no cap.
        </div>
      </div>

      {/* metadata corners */}
      <div style={{ position: "absolute", bottom: 200, left: 24, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", color: "var(--ghost)", lineHeight: 1.7 }}>
        AURA<br/>MEASUREMENT<br/>STATION
      </div>
      <div style={{ position: "absolute", bottom: 200, right: 24, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", color: "var(--ghost)", lineHeight: 1.7 }}>
        ISSUE<br/>N°01<br/>2026</div>

      {/* CTA */}
      <div style={{ position: "absolute", bottom: 110, left: 20, right: 20 }}>
        <div style={{ background: "var(--hazard)", padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--ink)", letterSpacing: "-0.02em", paddingTop: 4 }}>ENTER</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--ink)" }}>→</div>
        </div>
        <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ghost)", letterSpacing: "0.18em", textAlign: "center" }}>
          16+ ONLY · WE DON'T SERVE MINORS FR FR
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── 02 — onboarding (age gate) ────────── */

function AgeGate() {
  return (
    <div className="phone-bg">
      <div className="grain-overlay" />
      <StatusStrip right="01 / 03" />

      <div style={{ position: "absolute", top: 110, left: 24, right: 24 }}>
        <Eyebrow num="01" label="VERIFY" />
        <div style={{ marginTop: 24, fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 0.9, letterSpacing: "-0.02em", color: "var(--paper)", textTransform: "uppercase", paddingTop: 8 }}>
          HOW OLD<br/>ARE YOU<br/>FR.
        </div>
        <div style={{ marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--paper-mute)", lineHeight: 1.5 }}>
          we don't serve minors. drop your real DOB.
        </div>

        <div style={{ marginTop: 36 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 10, letterSpacing: "0.2em", color: "var(--paper-mute)", textTransform: "uppercase", marginBottom: 8 }}>DATE OF BIRTH</div>
          <div style={{ background: "var(--ink-2)", border: "1px solid var(--hazard)", padding: 16, fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--hazard)", display: "flex", justifyContent: "space-between" }}>
            <span>04 / 12 / 2008</span><span style={{ color: "var(--ghost)" }}>▼</span>
          </div>
          <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mint)", letterSpacing: "0.05em" }}>
            ✓ 17 years · in the kitchen
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 60, left: 20, right: 20 }}>
        <div style={{ background: "var(--hazard)", padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink)", letterSpacing: "-0.02em", paddingTop: 3 }}>CONTINUE</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink)" }}>→</div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── 03 — home (camera) ────────────────── */

function Home() {
  return (
    <div className="phone-bg">
      <div className="grain-overlay" />
      <StatusStrip right="◉ LIVE" />

      <div style={{ position: "absolute", top: 100, left: 20, right: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <Wordmark size={28} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "var(--ghost)", textAlign: "right", lineHeight: 1.6 }}>
          @YOUGOTMOGGED<br/>PEAK · 874
        </div>
      </div>

      {/* camera viewport */}
      <div style={{ position: "absolute", top: 156, left: 20, right: 20, bottom: 260, background: "linear-gradient(180deg,#3a3a3a 0%,#1a1a1a 100%)", border: "1px solid var(--border)", overflow: "hidden" }}>
        <div className="grain-overlay" />
        {/* viewfinder corners */}
        {[0,1,2,3].map(i => {
          const styles = [
            { top: 12, left: 12, borderTop: "2px solid var(--hazard)", borderLeft: "2px solid var(--hazard)" },
            { top: 12, right: 12, borderTop: "2px solid var(--hazard)", borderRight: "2px solid var(--hazard)" },
            { bottom: 12, left: 12, borderBottom: "2px solid var(--hazard)", borderLeft: "2px solid var(--hazard)" },
            { bottom: 12, right: 12, borderBottom: "2px solid var(--hazard)", borderRight: "2px solid var(--hazard)" },
          ];
          return <div key={i} style={{ position: "absolute", width: 28, height: 28, ...styles[i] }} />;
        })}
        <div style={{ position: "absolute", top: 22, left: 22, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.25em", color: "var(--hazard)" }}>● REC</div>
        <div style={{ position: "absolute", bottom: 22, right: 22, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "var(--paper-mute)" }}>1.0× · WIDE</div>
      </div>

      {/* shutter row */}
      <div style={{ position: "absolute", bottom: 184, left: 20, right: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ width: 44, height: 44, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 20, color: "var(--paper-mute)" }}>↗</div>
        <div style={{ width: 80, height: 80, border: "3px solid var(--hazard)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 60, height: 60, background: "var(--hazard)", borderRadius: "50%" }} />
        </div>
        <div style={{ width: 44, height: 44, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 20, color: "var(--paper-mute)" }}>↺</div>
      </div>
      <div style={{ position: "absolute", bottom: 144, left: 0, right: 0, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.25em", color: "var(--paper)" }}>
        TAP TO DROP A PIC
      </div>
      <div style={{ position: "absolute", bottom: 124, left: 0, right: 0, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", color: "var(--ghost)" }}>
        OR PICK FROM GALLERY →
      </div>

      <TabBar active="rate" />
    </div>
  );
}

/* ───────────────────────────── 04 — pick a path ──────────────────── */

function PickPath() {
  // ── Modal variant (W2 plan) ──
  // Slides over the Home tab as a slam-cut sheet — no spring.
  // Ink backdrop @ 60%, no blur. Tap row = commit + slam-cut out.
  // ✕ = "I changed my mind, keep current."
  const paths = [
    { num: "01", name: "AURAMAXXING",  desc: "main character energy. the whole vibe.",   active: true  },
    { num: "02", name: "LOOKSMAXXING", desc: "the glow-up audit. drip + structure.",     active: false },
    { num: "03", name: "MOGGER MODE",  desc: "raw dominance. who's mogging the room.",   active: false },
    { num: "04", name: "RIZZMAXXING",  desc: "charm + magnetism index.",                 active: false },
    { num: "05", name: "STATUSMAXXING",desc: "the flex inspector. real or fake.",        active: false },
    { num: "06", name: "BRAINROT MODE",desc: "internet poisoning. peak ohio energy.",    active: false },
    { num: "07", name: "SIGMA GRINDSET",desc:"discipline + lone wolf signal.",           active: false },
  ];

  // Modal occupies ~85% of phone viewport (320 × 693 → sheet ~589 tall, top edge ~104).
  const SHEET_TOP = 104;
  const HAZARD_H = 24;

  return (
    <div className="phone-bg">
      {/* faint grain stays on the dark backdrop so it still feels like product */}
      <div className="grain-overlay" />

      {/* DIMMED HOME (the page underneath, briefly visible) — */}
      {/* using a stripped placeholder so the modal context reads. */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.18, pointerEvents: "none" }}>
        <StatusStrip right="LENS · SIGMA" />
        <div style={{ position: "absolute", top: 60, left: 20, right: 20, fontFamily: "var(--font-display)", fontSize: 38, lineHeight: 0.9, letterSpacing: "-0.02em", color: "var(--paper)", textTransform: "uppercase" }}>
          GET<br/>COOKED.
        </div>
      </div>

      {/* BACKDROP — 60% ink, no blur */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,10,0.6)" }} />

      {/* SHEET */}
      <div style={{
        position: "absolute",
        top: SHEET_TOP, left: 0, right: 0, bottom: 0,
        background: "var(--ink)",
        borderTop: "1px solid var(--hazard)",
        display: "flex", flexDirection: "column",
        boxShadow: "0 -8px 0 rgba(10,10,10,0.5)",
      }}>
        {/* HAZARD TAPE — 24px */}
        <div style={{
          height: HAZARD_H,
          background: "repeating-linear-gradient(45deg, var(--ink) 0 7px, var(--hazard) 7px 14px)",
          flexShrink: 0,
        }} />

        {/* EYEBROW + CLOSE */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px 10px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontWeight: 700,
            fontSize: 10, letterSpacing: "0.28em",
            color: "var(--hazard)", textTransform: "uppercase",
          }}>
            ── MODAL / PICK A LENS
          </div>
          <div style={{
            width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid var(--border)",
            color: "var(--paper)",
            fontFamily: "var(--font-display)", fontSize: 16, lineHeight: 1,
            paddingTop: 2,
          }}>✕</div>
        </div>

        {/* SCROLLABLE LIST */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {paths.map((p, i) => (
            <div key={p.num} style={{
              display: "flex", alignItems: "center",
              padding: p.active ? "14px 16px" : "14px 16px",
              background: p.active ? "var(--hazard)" : "var(--ink-2)",
              borderBottom: "1px solid " + (p.active ? "var(--ink)" : "var(--hazard-25)"),
            }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontWeight: 700,
                fontSize: 11, letterSpacing: "0.22em",
                color: p.active ? "var(--ink)" : "var(--ghost)",
                width: 32,
                opacity: p.active ? 0.75 : 1,
              }}>{p.num}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22, lineHeight: 1,
                  letterSpacing: "-0.01em",
                  color: p.active ? "var(--ink)" : "var(--paper)",
                  paddingTop: 3,
                  textTransform: "uppercase",
                }}>{p.name}</div>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10, letterSpacing: "0.04em",
                  color: p.active ? "var(--ink)" : "var(--ghost)",
                  marginTop: 4,
                  opacity: p.active ? 0.78 : 1,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{p.desc}</div>
              </div>

              <div style={{
                fontFamily: "var(--font-display)", fontSize: 20,
                color: p.active ? "var(--ink)" : "var(--ghost)",
                marginLeft: 8,
              }}>→</div>
            </div>
          ))}
        </div>

        {/* FOOTER META — "more is coming" */}
        <div style={{
          borderTop: "1px solid var(--border)",
          padding: "10px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontFamily: "var(--font-mono)", fontWeight: 700,
          fontSize: 9, letterSpacing: "0.22em",
          color: "var(--ghost)", textTransform: "uppercase",
          flexShrink: 0,
        }}>
          <span>▌SCROLLS · 7 OF 12 PATHS SHOWN</span>
          <span style={{ color: "var(--hazard)" }}>W3 · +5</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── 05 — analyzing ────────────────────── */

function Analyzing() {
  return (
    <div className="phone-bg">
      <div className="grain-overlay" />
      <StatusStrip right="ANALYZING" />

      {/* scanlines panel */}
      <div style={{ position: "absolute", top: 100, left: 20, right: 20, bottom: 280, background: "var(--ink-2)", border: "1px solid var(--border)", overflow: "hidden" }}>
        <PortraitFill tone="cool" />
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.45) 3px, rgba(0,0,0,0) 4px)", mixBlendMode: "multiply" }} />
        {/* scanning line */}
        <div style={{ position: "absolute", top: "55%", left: 0, right: 0, height: 2, background: "var(--hazard)", boxShadow: "0 0 18px rgba(255,214,10,0.7)" }} />
        <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "var(--hazard)" }}>
          <span>● SIGMA DETECTED</span><span>FRAME 0247 / 2400</span>
        </div>
        <div style={{ position: "absolute", bottom: 16, left: 16, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.25em", color: "var(--hazard)" }}>CALIBRATING JAW · 73%</div>
      </div>

      <div style={{ position: "absolute", bottom: 200, left: 20, right: 20 }}>
        <Eyebrow num="03" label="THE AI IS COOKING" />
        <div style={{ marginTop: 16, fontFamily: "var(--font-display)", fontSize: 36, lineHeight: 0.95, letterSpacing: "-0.02em", color: "var(--paper)", textTransform: "uppercase", paddingTop: 5 }}>
          COMPUTING THE<br/>MOG DIFFERENTIAL…
        </div>
        <div style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--paper-mute)", lineHeight: 1.5 }}>
          (don't refresh. you'll cook the cook.)
        </div>
      </div>

      <TabBar active="rate" />
    </div>
  );
}

/* ───────────────────────────── 06 — score result ─────────────────── */

function ScoreResult() {
  return (
    <div className="phone-bg">
      <div className="grain-overlay" />
      <StatusStrip right="N°02947 · 04.28.26" />

      {/* hazard tape stripe */}
      <div style={{ position: "absolute", top: 90, left: 0, right: 0, height: 14, backgroundImage: "repeating-linear-gradient(45deg, var(--ink) 0 8px, var(--hazard) 8px 16px)" }} />

      {/* the result card */}
      <div style={{ position: "absolute", top: 120, left: 14, right: 14, bottom: 200, background: "var(--ink-2)", border: "1px solid var(--border)", overflow: "hidden" }}>
        <PortraitFill tone="cool" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 28%, rgba(10,10,10,0.94) 68%, #0A0A0A 100%)" }} />

        {/* crop marks */}
        <div style={{ position: "absolute", top: 8, left: 8, width: 18, height: 18, borderTop: "1px solid var(--hazard)", borderLeft: "1px solid var(--hazard)" }} />
        <div style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderTop: "1px solid var(--hazard)", borderRight: "1px solid var(--hazard)" }} />

        <div style={{ position: "absolute", top: 14, left: 14, right: 14, display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: "var(--paper)" }}>
          <Wordmark size={14} />
          <span style={{ color: "var(--paper-mute)" }}>@YOUGOTMOGGED</span>
        </div>

        <div style={{ position: "absolute", top: 56, left: 14, background: "var(--hazard)", padding: "4px 8px", transform: "rotate(-2deg)", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, color: "var(--ink)", letterSpacing: "0.15em" }}>
          • AURAMAXXING
        </div>

        <div style={{ position: "absolute", bottom: 18, left: 14, right: 14 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.3em", color: "var(--hazard)" }}>▌ AURA</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 132, lineHeight: 0.78, letterSpacing: "-0.06em", color: "var(--paper)", textTransform: "uppercase", paddingTop: 10 }}>874</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "0.04em", color: "var(--hazard)", textTransform: "uppercase" }}>HIM / HER</div>
          <div style={{ height: 1, background: "var(--hazard-25)", margin: "10px 0 8px" }} />

          {/* 5 stat dots */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.18em", color: "var(--paper-mute)" }}>
            {[
              ["RIZZ", 91], ["DRIP", 84], ["JAW", 79], ["EYE", 88], ["AURA", 87],
            ].map(([k, v]) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--paper)", letterSpacing: "-0.02em", paddingTop: 2 }}>{v}</div>
                <div>{k}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.45, color: "var(--paper-mute)" }}>
            "the kitchen's open. you cooked. mid-tier mogger w/ a sigma kicker. keep building, no cap."
          </div>
        </div>
      </div>

      {/* actions */}
      <div style={{ position: "absolute", bottom: 100, left: 14, right: 14, display: "flex", gap: 8 }}>
        <div style={{ flex: 1, background: "var(--hazard)", padding: 14, textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11, letterSpacing: "0.22em", color: "var(--ink)" }}>↗ SHARE</div>
        <div style={{ flex: 1, border: "1px solid var(--border)", padding: 14, textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11, letterSpacing: "0.22em", color: "var(--paper-mute)" }}>↓ SAVE</div>
        <div style={{ flex: 1, border: "1px solid var(--border)", padding: 14, textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11, letterSpacing: "0.22em", color: "var(--paper-mute)" }}>⚔ BATTLE</div>
      </div>

      <TabBar active="rate" />
    </div>
  );
}

/* ───────────────────────────── 07 — mog board ────────────────────── */

function MogBoard() {
  const rows = [
    { rank: "01", user: "@DRIPLORD.WAV", peak: "MOG GOD · 17 STREAK", score: 963, top: true },
    { rank: "02", user: "@SIGMASZN", peak: "SIGMA · 9 STREAK", score: 947 },
    { rank: "03", user: "@AURA404", peak: "SIGMA · 6 STREAK", score: 921 },
    { rank: "04", user: "@MOGFATHER", peak: "HIM/HER · 11 STREAK", score: 897 },
    { rank: "05", user: "@RIZZBOSON", peak: "HIM/HER · 4 STREAK", score: 882 },
    { rank: "14", user: "@YOU (YOUGOTMOGGED)", peak: "▲ 3 SPOTS · 4 STREAK", score: 874, you: true },
  ];
  return (
    <div className="phone-bg">
      <div className="grain-overlay" />
      <StatusStrip right="WK 17 · GLOBAL" />

      <div style={{ position: "absolute", top: 100, left: 20, right: 20 }}>
        <Eyebrow num="04" label="THE RANKING" />
        <div style={{ marginTop: 14, fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 0.9, letterSpacing: "-0.03em", color: "var(--paper)", textTransform: "uppercase", paddingTop: 8 }}>
          MOG<br/>BOARD<span style={{ color: "var(--hazard)" }}>.</span>
        </div>
        <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--paper-mute)" }}>
          who's actually him right now.
        </div>
      </div>

      {/* tabs */}
      <div style={{ position: "absolute", top: 268, left: 20, right: 20, display: "flex", border: "1px solid var(--border)" }}>
        <div style={{ flex: 1, padding: 10, textAlign: "center", background: "var(--hazard)", borderRight: "1px solid var(--ink)", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.2em", color: "var(--ink)" }}>GLOBAL</div>
        <div style={{ flex: 1, padding: 10, textAlign: "center", borderRight: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.2em", color: "var(--ghost)" }}>BY PATH</div>
        <div style={{ flex: 1, padding: 10, textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.2em", color: "var(--ghost)" }}>CIRCLE</div>
      </div>

      {/* rows */}
      <div style={{ position: "absolute", top: 312, left: 20, right: 20, bottom: 110 }}>
        {rows.map((r) => {
          const bg = r.top ? "var(--hazard)" : "var(--ink-2)";
          const text = r.top ? "var(--ink)" : (r.you ? "var(--hazard)" : "var(--paper)");
          const sub = r.top ? "rgba(10,10,10,0.7)" : (r.you ? "var(--hazard)" : "var(--ghost)");
          return (
            <div key={r.rank} style={{ display: "flex", alignItems: "center", padding: "10px 12px", background: bg, borderBottom: "1px solid " + (r.top ? "var(--ink)" : "var(--border)"), borderLeft: r.you ? "3px solid var(--hazard)" : "none", marginLeft: r.you ? -3 : 0 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: text, width: 38, letterSpacing: "-0.04em", paddingTop: 3 }}>{r.rank}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: text, letterSpacing: "-0.01em", paddingTop: 2 }}>{r.user}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: sub, letterSpacing: "0.18em", marginTop: 1 }}>{r.peak}</div>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: text, letterSpacing: "-0.04em", paddingTop: 3 }}>{r.score}</div>
            </div>
          );
        })}
      </div>

      <TabBar active="board" />
    </div>
  );
}

/* ───────────────────────────── 08 — battle ───────────────────────── */

function Battle() {
  return (
    <div className="phone-bg">
      <div className="grain-overlay" />
      <StatusStrip right="1V1 · ROUND 2 / 3" />

      <div style={{ position: "absolute", top: 100, left: 20, right: 20 }}>
        <Eyebrow num="05" label="1V1 BATTLE" />
        <div style={{ marginTop: 12, fontFamily: "var(--font-display)", fontSize: 44, lineHeight: 0.9, letterSpacing: "-0.02em", color: "var(--paper)", textTransform: "uppercase", paddingTop: 6 }}>
          WHO MOGS<br/>WHO.
        </div>
      </div>

      {/* split */}
      <div style={{ position: "absolute", top: 246, left: 20, right: 20, display: "flex", border: "1px solid var(--border)" }}>
        <div style={{ flex: 1, padding: 16, background: "var(--ink-2)", borderRight: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "var(--ghost)" }}>YOU</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--paper)", letterSpacing: "-0.01em", marginTop: 2, paddingTop: 2 }}>@YOUGOTMOGGED</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 64, color: "var(--mint)", letterSpacing: "-0.05em", marginTop: 18, paddingTop: 8 }}>881</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "var(--mint)", marginTop: 4 }}>+0.14× MULT</div>
        </div>
        <div style={{ flex: 1, padding: 16 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "var(--ghost)", textAlign: "right" }}>OPP</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--paper-mute)", letterSpacing: "-0.01em", marginTop: 2, textAlign: "right", paddingTop: 2 }}>@SIGMASZN</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 64, color: "var(--paper-mute)", letterSpacing: "-0.05em", marginTop: 18, textAlign: "right", paddingTop: 8 }}>847</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "var(--blood)", marginTop: 4, textAlign: "right" }}>−34 BEHIND</div>
        </div>
      </div>

      {/* delta */}
      <div style={{ position: "absolute", top: 432, left: 20, right: 20, background: "var(--hazard)", padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 10, letterSpacing: "0.2em", color: "var(--ink)" }}>YOU MOG · ROUND 2</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink)", letterSpacing: "-0.04em", paddingTop: 3 }}>+34</div>
      </div>

      {/* commentary */}
      <div style={{ position: "absolute", top: 488, left: 20, right: 20, background: "var(--ink-2)", border: "1px solid var(--border)", padding: 14 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.25em", color: "var(--hazard)" }}>▌ COMMENTARY</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--paper-mute)", lineHeight: 1.5, marginTop: 8 }}>
          "we have not seen rizz numbers like this in this kitchen. sigmaszn, take 5. this round is cooked."
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 100, left: 20, right: 20, background: "var(--hazard)", padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink)", letterSpacing: "-0.02em", paddingTop: 3 }}>ROUND 3 →</div>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 10, color: "var(--ink)", letterSpacing: "0.18em" }}>FINAL ROUND</div>
      </div>

      <TabBar active="battle" />
    </div>
  );
}

/* ───────────────────────────── 09 — challenges ───────────────────── */

function Challenges() {
  const items = [
    { num: "01", t: "DROP 3 PICS TODAY", s: "auramaxxing only · +1.5× mult", p: 67, locked: false },
    { num: "02", t: "WIN 1V1", s: "any path · +2× on next score", p: 0, locked: false },
    { num: "03", t: "TOP 100 GLOBAL", s: "current rank: 14 · already in", p: 100, done: true },
    { num: "04", t: "SIGMA STREAK ×5", s: "score 900+ five times in a row", p: 40, locked: false },
    { num: "05", t: "INVITE 3 FRIENDS", s: "they have to actually drop a pic", p: 33, locked: false },
  ];
  return (
    <div className="phone-bg">
      <div className="grain-overlay" />
      <StatusStrip right="04.28.26" />

      <div style={{ position: "absolute", top: 100, left: 20, right: 20 }}>
        <Eyebrow num="06" label="DAILY · RESETS 00:00" />
        <div style={{ marginTop: 12, fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 0.9, letterSpacing: "-0.03em", color: "var(--paper)", textTransform: "uppercase", paddingTop: 8 }}>
          LOCK<br/>IN<span style={{ color: "var(--hazard)" }}>.</span>
        </div>
        <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--paper-mute)" }}>
          5 challenges. score multipliers stack.
        </div>
      </div>

      <div style={{ position: "absolute", top: 290, left: 20, right: 20, bottom: 110 }}>
        {items.map((c, i) => (
          <div key={c.num} style={{ borderTop: i === 0 ? "1px solid var(--hazard-25)" : "1px solid var(--border)", padding: "12px 0", display: "flex", alignItems: "center", gap: 12, opacity: c.done ? 0.55 : 1 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 10, letterSpacing: "0.2em", color: c.done ? "var(--mint)" : "var(--ghost)", width: 28 }}>{c.done ? "✓" : c.num}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "-0.01em", color: c.done ? "var(--mint)" : "var(--paper)", paddingTop: 2 }}>{c.t}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--paper-mute)", marginTop: 2 }}>{c.s}</div>
              <div style={{ height: 2, background: "var(--border)", marginTop: 8, position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: c.p + "%", background: c.done ? "var(--mint)" : "var(--hazard)" }} />
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 10, color: c.done ? "var(--mint)" : "var(--hazard)", letterSpacing: "0.15em", minWidth: 36, textAlign: "right" }}>{c.p}%</div>
          </div>
        ))}
      </div>

      <TabBar active="rate" />
    </div>
  );
}

/* ───────────────────────────── 10 — profile ──────────────────────── */

function Profile() {
  return (
    <div className="phone-bg">
      <div className="grain-overlay" />
      <StatusStrip right="@YOUGOTMOGGED" />

      <div style={{ position: "absolute", top: 100, left: 20, right: 20 }}>
        <Eyebrow num="07" label="THE FILE" />
        <div style={{ marginTop: 12, fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 0.9, letterSpacing: "-0.03em", color: "var(--paper)", textTransform: "uppercase", paddingTop: 8 }}>
          YOU<span style={{ color: "var(--hazard)" }}>.</span>
        </div>
        <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--paper-mute)" }}>
          @yougotmogged · joined 03.14.26
        </div>
      </div>

      {/* peak block */}
      <div style={{ position: "absolute", top: 260, left: 20, right: 20, display: "flex", border: "1px solid var(--border)" }}>
        <div style={{ flex: 1, padding: 14, background: "var(--ink-2)", borderRight: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "var(--ghost)" }}>PEAK</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--hazard)", letterSpacing: "-0.04em", marginTop: 4, paddingTop: 5 }}>912</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--hazard)", letterSpacing: "0.2em" }}>SIGMA · 04.21</div>
        </div>
        <div style={{ flex: 1, padding: 14, background: "var(--ink-2)", borderRight: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "var(--ghost)" }}>AVG</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--paper)", letterSpacing: "-0.04em", marginTop: 4, paddingTop: 5 }}>847</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--paper-mute)", letterSpacing: "0.2em" }}>HIM/HER</div>
        </div>
        <div style={{ flex: 1, padding: 14, background: "var(--ink-2)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "var(--ghost)" }}>RANK</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--paper)", letterSpacing: "-0.04em", marginTop: 4, paddingTop: 5 }}>14</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--mint)", letterSpacing: "0.2em" }}>▲ 3 WK</div>
        </div>
      </div>

      {/* recent grid */}
      <div style={{ position: "absolute", top: 412, left: 20, right: 20 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 10, letterSpacing: "0.25em", color: "var(--paper-mute)", textTransform: "uppercase", marginBottom: 10 }}>RECENT · 6 OF 47</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {[874, 891, 802, 766, 912, 833].map((s, i) => (
            <div key={i} style={{ aspectRatio: "9/16", background: "var(--ink-2)", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
              <PortraitFill tone={i % 2 ? "warm" : "cool"} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.85) 100%)" }} />
              <div style={{ position: "absolute", bottom: 4, left: 6, fontFamily: "var(--font-display)", fontSize: 22, color: "var(--paper)", letterSpacing: "-0.04em", lineHeight: 0.85, paddingTop: 3 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="you" />
    </div>
  );
}

/* ───────────────────────────── 11 — paywall ──────────────────────── */

function Paywall() {
  return (
    <div className="phone-bg">
      <div className="grain-overlay" />
      <StatusStrip right="3 OF 3 USED" />

      <div style={{ position: "absolute", top: 90, left: 0, right: 0, height: 18, backgroundImage: "repeating-linear-gradient(45deg, var(--ink) 0 10px, var(--hazard) 10px 20px)" }} />

      <div style={{ position: "absolute", top: 130, left: 20, right: 20 }}>
        <Eyebrow num="08" label="DAILY LIMIT" />
        <div style={{ marginTop: 14, fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 0.88, letterSpacing: "-0.03em", color: "var(--paper)", textTransform: "uppercase", paddingTop: 8 }}>
          KITCHEN<br/>CLOSED<span style={{ color: "var(--hazard)" }}>.</span>
        </div>
        <div style={{ marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--paper-mute)", lineHeight: 1.5 }}>
          you used 3/3 free aura reads today.<br/>resets at 00:00. or unlock unlimited.
        </div>
      </div>

      {/* tier */}
      <div style={{ position: "absolute", top: 360, left: 20, right: 20, background: "var(--hazard)", padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, color: "var(--ink)", letterSpacing: "0.25em" }}>▌ MOGSTER PLUS</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--ink)", letterSpacing: "-0.02em", marginTop: 6, paddingTop: 4 }}>UNLIMITED</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--ink)", letterSpacing: "-0.04em", paddingTop: 4 }}>$4.99</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink)", letterSpacing: "0.2em", opacity: 0.7 }}>/ MONTH</div>
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(10,10,10,0.25)", margin: "14px 0" }} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink)", lineHeight: 1.7 }}>
          • unlimited aura reads<br/>
          • 1v1 battles · no cooldown<br/>
          • mog board badge · ◉ verified mogger<br/>
          • all 7 sigma paths unlocked
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 130, left: 20, right: 20 }}>
        <div style={{ background: "var(--ink-2)", border: "1px solid var(--hazard)", padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--hazard)", letterSpacing: "-0.02em", paddingTop: 3 }}>UNLOCK</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--hazard)" }}>→</div>
        </div>
        <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ghost)", letterSpacing: "0.2em", textAlign: "center", textTransform: "uppercase" }}>
          OR COME BACK AT 00:00 · WE GET IT
        </div>
      </div>

      <TabBar active="rate" />
    </div>
  );
}

/* ───────────────────────────── 12 — moderation reject ────────────── */

function Reject() {
  return (
    <div className="phone-bg">
      <div className="grain-overlay" />
      <StatusStrip right="REVIEW · A" />

      {/* customs-form dashed card */}
      <div style={{ position: "absolute", top: 120, left: 20, right: 20, border: "2px dashed var(--hazard)", padding: 22, background: "var(--ink)" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.25em", color: "var(--hazard)" }}>⚠ AURA STATION</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "var(--paper-mute)" }}>FORM 04A</div>
        </div>

        <div style={{ marginTop: 26, fontFamily: "var(--font-display)", fontSize: 40, lineHeight: 0.9, letterSpacing: "-0.02em", color: "var(--paper)", textTransform: "uppercase", paddingTop: 6 }}>
          AURA<br/>UNREADABLE.
        </div>

        <div style={{ marginTop: 18, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--paper-mute)", lineHeight: 1.55 }}>
          we couldn't get a clean read on this one. could be the lighting. could be brainrot interference. either way — keep building, king.
        </div>

        <div style={{ height: 1, background: "var(--hazard-25)", margin: "20px 0 14px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "var(--ghost)" }}>
          <span>CODE A · LOW SIGNAL</span>
          <span>04.28.26 · 14:22</span>
        </div>

        <div style={{ position: "absolute", top: -10, right: -10, transform: "rotate(8deg)", background: "var(--blood)", color: "var(--paper)", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 10, letterSpacing: "0.2em", padding: "5px 9px" }}>
          RETURN TO SENDER
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 140, left: 20, right: 20 }}>
        <div style={{ background: "var(--hazard)", padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ink)", letterSpacing: "-0.02em", paddingTop: 3 }}>DROP ANOTHER</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ink)" }}>→</div>
        </div>
        <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ghost)", letterSpacing: "0.18em", textAlign: "center" }}>
          2 OF 3 AURA READS LEFT TODAY
        </div>
      </div>

      <TabBar active="rate" />
    </div>
  );
}

/* ───────────────────────────── 13 — top tier (1000) ──────────────── */

function TopTier() {
  return (
    <div className="phone-bg">
      <div className="grain-overlay" />
      <StatusStrip right="N°02948" />

      {/* radial glow */}
      <PortraitFill radial />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 0%, rgba(10,10,10,0.6) 50%, #0A0A0A 100%)" }} />

      <div style={{ position: "absolute", top: 120, left: 20, right: 20 }}>
        <div style={{ background: "var(--paper)", padding: "5px 10px", display: "inline-block", transform: "rotate(-2deg)", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 10, color: "var(--ink)", letterSpacing: "0.18em" }}>
          • SKIBIDI ALERT
        </div>
      </div>

      <div style={{ position: "absolute", top: 200, left: 20, right: 20, textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11, letterSpacing: "0.35em", color: "var(--paper)" }}>▌ AURA · MAX</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 220, lineHeight: 0.78, letterSpacing: "-0.06em", color: "var(--paper)", textTransform: "uppercase", paddingTop: 18, textShadow: "0 0 60px rgba(255,214,10,0.5)" }}>1000</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: "0.04em", color: "var(--paper)", textTransform: "uppercase", marginTop: 4 }}>SKIBIDI TIER</div>
      </div>

      <div style={{ position: "absolute", bottom: 220, left: 24, right: 24 }}>
        <div style={{ height: 1, background: "var(--paper)", marginBottom: 16, opacity: 0.4 }} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--paper)", lineHeight: 1.5, textAlign: "center" }}>
          "we have to call the chefs. you broke the kitchen. there is no number above this one."
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 130, left: 20, right: 20, display: "flex", gap: 8 }}>
        <div style={{ flex: 1, background: "var(--paper)", padding: 14, textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11, letterSpacing: "0.22em", color: "var(--ink)" }}>↗ SHARE</div>
        <div style={{ flex: 1, border: "1px solid var(--paper)", padding: 14, textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11, letterSpacing: "0.22em", color: "var(--paper)" }}>↓ SAVE</div>
      </div>

      <TabBar active="rate" />
    </div>
  );
}

/* ───────────────────────────── 14 — settings / account ───────────── */

function Settings() {
  const rows = [
    ["NOTIFICATIONS", "ON", true],
    ["BIOMETRIC LOCK", "OFF", false],
    ["PRIVATE MODE", "OFF", false],
    ["SHARE TO STORY", "ON", true],
    ["RESTORE PURCHASE", "→", null],
    ["DELETE ACCOUNT", "→", null, true],
  ];
  return (
    <div className="phone-bg">
      <div className="grain-overlay" />
      <StatusStrip right="ACCOUNT" />

      <div style={{ position: "absolute", top: 100, left: 20, right: 20 }}>
        <Eyebrow num="09" label="SETTINGS" />
        <div style={{ marginTop: 12, fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 0.9, letterSpacing: "-0.03em", color: "var(--paper)", textTransform: "uppercase", paddingTop: 8 }}>
          ADMIN<span style={{ color: "var(--hazard)" }}>.</span>
        </div>
      </div>

      <div style={{ position: "absolute", top: 256, left: 20, right: 20, bottom: 110 }}>
        {rows.map((r, i) => {
          const [label, val, on, danger] = r;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "16px 0", borderTop: "1px solid var(--border)", borderBottom: i === rows.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ flex: 1, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11, letterSpacing: "0.22em", color: danger ? "var(--blood)" : "var(--paper)" }}>{label}</div>
              {on === null ? (
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: danger ? "var(--blood)" : "var(--ghost)" }}>{val}</div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: on ? "var(--hazard)" : "var(--ghost)" }}>{val}</span>
                  <div style={{ width: 36, height: 18, background: on ? "var(--hazard)" : "var(--ink-2)", border: "1px solid " + (on ? "var(--hazard)" : "var(--border)"), position: "relative" }}>
                    <div style={{ position: "absolute", top: 1, [on ? "right" : "left"]: 1, width: 16, height: 14, background: on ? "var(--ink)" : "var(--ghost)" }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <TabBar active="you" />
    </div>
  );
}

/* expose to window */
Object.assign(window, {
  Splash, AgeGate, Home, PickPath, Analyzing, ScoreResult,
  MogBoard, Battle, Challenges, Profile, Paywall, Reject, TopTier, Settings
});
