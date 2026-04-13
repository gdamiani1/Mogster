import {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  AdEventType,
} from "react-native-google-mobile-ads";

const REWARDED_AD_UNIT = __DEV__
  ? TestIds.REWARDED
  : "ca-app-pub-xxxxx/xxxxx"; // Replace with real ID

let rewardedAd: RewardedAd | null = null;

export function loadRewardedAd(): void {
  rewardedAd = RewardedAd.createForAdRequest(REWARDED_AD_UNIT);

  rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
    console.log("Rewarded ad loaded \u2014 extra aura check ready");
  });

  rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
    console.log("Ad failed to load:", error);
  });

  rewardedAd.load();
}

export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!rewardedAd) {
      resolve(false);
      return;
    }

    rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      resolve(true);
      loadRewardedAd(); // Preload next ad
    });

    rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      resolve(false);
      loadRewardedAd();
    });

    rewardedAd.show();
  });
}
