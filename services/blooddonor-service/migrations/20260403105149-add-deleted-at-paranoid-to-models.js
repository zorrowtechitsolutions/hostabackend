'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('blood_donors', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    } catch (e) { console.log('Column deletedAt already exists in blood_donors'); }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('blood_donors', 'deletedAt');
    } catch (e) {}
  }
};
