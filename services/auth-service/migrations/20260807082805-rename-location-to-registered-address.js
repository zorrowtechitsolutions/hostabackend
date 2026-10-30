'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('audit_logs');
    if (tableInfo.location && !tableInfo.registeredAddress) {
      await queryInterface.renameColumn(
        'audit_logs',
        'location',
        'registeredAddress'
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('audit_logs');
    if (tableInfo.registeredAddress && !tableInfo.location) {
      await queryInterface.renameColumn(
        'audit_logs',
        'registeredAddress',
        'location'
      );
    }
  }
};