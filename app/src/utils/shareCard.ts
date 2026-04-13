import { RefObject } from "react";
import { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

/**
 * Capture the ShareableCard view as a PNG and open the native share sheet.
 * Pass the ref attached to the ShareableCard component.
 */
export async function shareAuraCard(cardRef: RefObject<View>): Promise<void> {
  if (!cardRef.current) {
    throw new Error("ShareableCard ref is not attached");
  }

  const uri = await captureRef(cardRef, {
    format: "png",
    quality: 1,
    result: "tmpfile",
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device");
  }

  await Sharing.shareAsync(uri, {
    mimeType: "image/png",
    dialogTitle: "Share your Aura",
    UTI: "public.png",
  });
}
