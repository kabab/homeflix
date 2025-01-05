const config = require('../config');

class MigrationManager {
  /**
   * @param {Object} config
   * @param {Object} config.db
   */
  constructor() {
    
  }

  register(migration) {
    this.migrations.push(migration);
  }

  async run() {
    for (const migration of this.migrations) {
      await migration.up();
    }
  }
}