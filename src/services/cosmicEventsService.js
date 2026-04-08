// Minimal cosmicEventsService implementation for build compatibility
// TODO: Implement actual cosmic events functionality

export const cosmicEventsService = {
  async getActiveEvent() {
    // Return null for now - no active events
    return null;
  },

  async getUserConstellations(userId) {
    // Return empty array for now - no constellations
    return [];
  },

  async incrementBond(user1Id, user2Id, amount) {
    // Stub implementation - does nothing for now
    console.log(`incrementBond called: ${user1Id}, ${user2Id}, ${amount}`);
  }
};
