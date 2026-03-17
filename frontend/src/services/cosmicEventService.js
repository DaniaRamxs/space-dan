// Minimal cosmicEventService implementation for build compatibility
// TODO: Implement actual cosmic event functionality

export const cosmicEventService = {
  async registerCosmeticUnlock({ userId, username, itemTitle, rarity }) {
    // Stub implementation - does nothing for now
    console.log('registerCosmeticUnlock called:', { userId, username, itemTitle, rarity });
  }
};
