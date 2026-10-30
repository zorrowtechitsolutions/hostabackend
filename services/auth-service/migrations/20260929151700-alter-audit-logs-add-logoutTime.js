'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableInfo = await queryInterface.describeTable('audit_logs');
      if (!tableInfo.logoutTime) {
        await queryInterface.addColumn('audit_logs', 'logoutTime', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });
      }
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableInfo = await queryInterface.describeTable('audit_logs');
      if (tableInfo.logoutTime) {
        await queryInterface.removeColumn('audit_logs', 'logoutTime', { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
