'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('patients');
    if (!tableInfo.hospitalName) {
      await queryInterface.addColumn('patients', 'hospitalName', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('patients');
    if (tableInfo.hospitalName) {
      await queryInterface.removeColumn('patients', 'hospitalName');
    }
  }
};
