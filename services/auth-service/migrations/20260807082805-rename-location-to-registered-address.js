'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      'audit_logs',
      'location',
      'registeredAddress'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      'audit_logs',
      'registeredAddress',
      'location'
    );
  }
};