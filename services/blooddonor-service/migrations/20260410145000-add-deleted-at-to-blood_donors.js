'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('blood_donors').catch(() => null);
    if (tableInfo && !tableInfo.deletedAt) {
      await queryInterface.addColumn('blood_donors', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('blood_donors', 'deletedAt');
    } catch (e) {
      console.log('Skipping down migration: relation does not exist');
    }
  }
};
