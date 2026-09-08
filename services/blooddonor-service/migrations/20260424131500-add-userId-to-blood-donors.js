'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('blood_donors');
    if (!tableInfo.userId) {
      await queryInterface.addColumn('blood_donors', 'userId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1, // Defaulting to 1 for existing records, or you can use a real ID
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('blood_donors');
    if (tableInfo.userId) {
      await queryInterface.removeColumn('blood_donors', 'userId');
    }
  }
};
