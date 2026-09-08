'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    const table = await queryInterface.describeTable('blood_donors');

    if (!table.name) {
      await queryInterface.addColumn('blood_donors', 'name', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {

    const table = await queryInterface.describeTable('blood_donors');

    if (table.name) {
      await queryInterface.removeColumn('blood_donors', 'name');
    }
  },
};