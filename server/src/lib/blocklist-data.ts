// SAFETY: this file contains intentionally offensive terms used ONLY to
// detect and block harmful AI output. Do not add brand vocabulary here.
//
// Brand-safe terms (DO NOT add): sigma, mogger, brainrot, skibidi,
// down bad, cooked, looksmaxxing, mid, ohio, rizz, sigma grindset, NPC.
//
// Maintenance: edit this file directly. Re-run blocklist tests after edits.

export const BLOCKLIST_SLURS: string[] = [
  // Race/ethnicity slurs
  "n1gg", "n1gger", "nigger", "nigga",
  "ch1nk", "chink",
  "sp1c", "spic",
  "k1ke", "kike",
  "g00k", "gook",
  "wetb4ck", "wetback",
  // Sexuality/gender slurs
  "f4ggot", "faggot", "f4g", " fag ",
  "tr4nny", "tranny",
  "d1ke", "dyke",
  // Ableist
  "r3tard", "retard", "r3tarded", "retarded",
  "m0ngoloid", "mongoloid",
  "sp4z", "spaz",
];

export const BLOCKLIST_SELF_HARM: string[] = [
  "kill yourself", "kys", "k.y.s", "k y s",
  "neck yourself", "neck urself",
  "rope yourself", "go rope",
  "an hero",
  "end it all", "end yourself",
  "off yourself",
  "commit sui",
];

export const BLOCKLIST_BODY_FEATURE: string[] = [
  // Nose
  "your nose is", "ur nose is", "fix your nose", "fix that nose",
  "nose job", "nosejob", "rhinoplasty",
  "crooked nose", "big nose", "huge nose",
  // Weight
  "fat ass", "fatass", "lose weight", "ur fat", "you're fat", "youre fat",
  "skinny ass", "skinnyass", "bony ass",
  "your weight", "ur weight",
  "obese", "morbidly",
  // Skin
  "your acne", "ur acne", "your skin is",
  "your zits", "covered in acne",
  // Teeth
  "your teeth", "ur teeth", "fix your teeth", "british teeth",
  "yellow teeth", "rotting teeth",
  // Jaw / hairline / forehead (looksmaxxing landmines)
  "your jaw", "ur jaw", "weak jaw", "no jawline",
  "your hairline", "ur hairline", "receding hairline", "balding",
  "your forehead", "ur forehead", "fivehead", "huge forehead",
  // Eyes
  "your eyes are", "lazy eye",
  // Surgery / general feature shaming
  "get surgery", "needs surgery", "plastic surgery would", "facial surgery",
  "ugly face", "ugly mug",
];

export const BLOCKLIST_SEXUAL: string[] = [
  // Explicit terms only; brand can be horny-adjacent
  "blowjob", "bj", "handjob",
  "cumslut", "cock", "dick suck",
  "your tits", "ur tits", "your boobs",
  "fuckable", "unfuckable",
];

export const ALL_BLOCKLISTS = {
  slurs: BLOCKLIST_SLURS,
  self_harm: BLOCKLIST_SELF_HARM,
  body_feature: BLOCKLIST_BODY_FEATURE,
  sexual: BLOCKLIST_SEXUAL,
} as const;

export type BlocklistCategory = keyof typeof ALL_BLOCKLISTS;
