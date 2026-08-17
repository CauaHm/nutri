import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot, type QueueSnapshot } from "./offlineQueue";

export function useOfflineQueueSnapshot(): QueueSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot);
}
