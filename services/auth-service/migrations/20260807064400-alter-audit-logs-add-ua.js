'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('audit_logs', 'browser', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('audit_logs', 'browserVersion', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('audit_logs', 'operatingSystem', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('audit_logs', 'osVersion', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('audit_logs', 'deviceType', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('audit_logs', 'userAgent', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.removeColumn('audit_logs', 'deviceBrowser', { transaction });
      
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('audit_logs', 'deviceBrowser', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.removeColumn('audit_logs', 'browser', { transaction });
      await queryInterface.removeColumn('audit_logs', 'browserVersion', { transaction });
      await queryInterface.removeColumn('audit_logs', 'operatingSystem', { transaction });
      await queryInterface.removeColumn('audit_logs', 'osVersion', { transaction });
      await queryInterface.removeColumn('audit_logs', 'deviceType', { transaction });
      await queryInterface.removeColumn('audit_logs', 'userAgent', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
