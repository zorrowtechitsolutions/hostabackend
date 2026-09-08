'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add the column
    await queryInterface.addColumn('staff', 'status', {
      type: Sequelize.STRING,
      defaultValue: 'PENDING',
      allowNull: true,
    });

    // 2. Backfill existing records to 'ACTIVE' since they were registered before this saga
    await queryInterface.sequelize.query(
      `UPDATE staff SET status = 'ACTIVE' WHERE status = 'PENDING';`
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Revert the migration by removing the column
    await queryInterface.removeColumn('staff', 'status');
  }
};
