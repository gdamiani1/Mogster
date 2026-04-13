// Notification templates with brainrot copy
export const NOTIFICATION_TEMPLATES = {
  friendBeatScore: (friendName: string) => ({
    title: "You're getting mogged \u{1F480}",
    body: `${friendName} just mogged your high score. You taking that L?`,
  }),
  dailyVibeCheck: (challengeTitle: string) => ({
    title: "Daily Vibe Check is live \u{2728}",
    body: `${challengeTitle} \u2014 Drop a pic or lose your streak fr`,
  }),
  streakWarning: (streak: number) => ({
    title: "Your streak is about to die \u{1F525}",
    body: `${streak}-day streak on the line. Don't crash out.`,
  }),
  friendRequest: (fromName: string) => ({
    title: "New link up request",
    body: `${fromName} wants to join your circle. Accept or nah?`,
  }),
  newW: (achievement: string) => ({
    title: "New W unlocked \u{1F3C6}",
    body: achievement,
  }),
};
