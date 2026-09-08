'use strict';

module.exports = {
  async up(queryInterface) {
    const table = await queryInterface.describeTable('blood_banks');

    if (table.roleId) {
      await queryInterface.removeColumn('blood_banks', 'roleId');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('blood_banks');

    if (!table.roleId) {
      await queryInterface.addColumn('blood_banks', 'roleId', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },
};