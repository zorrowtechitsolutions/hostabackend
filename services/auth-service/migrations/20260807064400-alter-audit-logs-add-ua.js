'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableInfo = await queryInterface.describeTable('audit_logs');

      if (!tableInfo.browser) {
        await queryInterface.addColumn('audit_logs', 'browser', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      }

      if (!tableInfo.browserVersion) {
        await queryInterface.addColumn('audit_logs', 'browserVersion', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      }

      if (!tableInfo.operatingSystem) {
        await queryInterface.addColumn('audit_logs', 'operatingSystem', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      }

      if (!tableInfo.osVersion) {
        await queryInterface.addColumn('audit_logs', 'osVersion', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      }

      if (!tableInfo.deviceType) {
        await queryInterface.addColumn('audit_logs', 'deviceType', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      }

      if (!tableInfo.userAgent) {
        await queryInterface.addColumn('audit_logs', 'userAgent', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      }

      if (tableInfo.deviceBrowser) {
        await queryInterface.removeColumn('audit_logs', 'deviceBrowser', { transaction });
      }
      
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableInfo = await queryInterface.describeTable('audit_logs');

      if (!tableInfo.deviceBrowser) {
        await queryInterface.addColumn('audit_logs', 'deviceBrowser', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      }

      if (tableInfo.browser) await queryInterface.removeColumn('audit_logs', 'browser', { transaction });
      if (tableInfo.browserVersion) await queryInterface.removeColumn('audit_logs', 'browserVersion', { transaction });
      if (tableInfo.operatingSystem) await queryInterface.removeColumn('audit_logs', 'operatingSystem', { transaction });
      if (tableInfo.osVersion) await queryInterface.removeColumn('audit_logs', 'osVersion', { transaction });
      if (tableInfo.deviceType) await queryInterface.removeColumn('audit_logs', 'deviceType', { transaction });
      if (tableInfo.userAgent) await queryInterface.removeColumn('audit_logs', 'userAgent', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
