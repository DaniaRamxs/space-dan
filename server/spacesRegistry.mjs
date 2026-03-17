/**
 * spacesRegistry
 *
 * Lightweight in-memory registry of active SpaceSession rooms.
 * Rooms self-register their preview snapshot so the Express endpoint
 * can return live data without hitting a DB.
 *
 * Shape of a preview entry:
 * {
 *   spaceId:      string
 *   spaceName:    string
 *   hostId:       string
 *   hostUsername: string
 *   hostAvatar:   string
 *   activity:     { type, id, label }
 *   users:        number
 *   preview: {
 *     thumbnail:  string | null   (image URL or null)
 *     track:      string | null   (song/video title)
 *     timestamp:  number          (seconds into content)
 *   }
 *   updatedAt:    number (ms)
 * }
 */

const _registry = new Map(); // spaceId → preview

export function registerSpace(spaceId, preview) {
  _registry.set(spaceId, { ...preview, updatedAt: Date.now() });
}

export function unregisterSpace(spaceId) {
  _registry.delete(spaceId);
}

export function getActiveSpaces() {
  const now = Date.now();
  // Drop stale entries (> 2 min without update — room probably died silently)
  for (const [id, entry] of _registry.entries()) {
    if (now - entry.updatedAt > 2 * 60 * 1000) _registry.delete(id);
  }
  return Array.from(_registry.values())
    .sort((a, b) => b.users - a.users); // most populated first
}
