'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableInfo = await queryInterface.describeTable('auths');
      
      if (!tableInfo.createdAt) {
        await queryInterface.addColumn('auths', 'createdAt', {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('now')
        }, { transaction });
      }

      if (!tableInfo.updatedAt) {
        await queryInterface.addColumn('auths', 'updatedAt', {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('now')
        }, { transaction });
      }

      if (!tableInfo.deleteDate) {
        await queryInterface.addColumn('auths', 'deleteDate', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }

      if (!tableInfo.isActive) {
        await queryInterface.addColumn('auths', 'isActive', {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        }, { transaction });
      }

      if (!tableInfo.isDelete) {
        await queryInterface.addColumn('auths', 'isDelete', {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        }, { transaction });
      }

      if (!tableInfo.otp) {
        await queryInterface.addColumn('auths', 'otp', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      }

      if (!tableInfo.otpExpiry) {
        await queryInterface.addColumn('auths', 'otpExpiry', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      // If table auths doesn't exist yet, we ignore the error as sync will create it with all fields.
      if (err.message.includes('No description found for')) {
        console.log('Table auths does not exist yet. Skipping column additions.');
      } else {
        throw err;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('auths', 'otpExpiry', { transaction });
      await queryInterface.removeColumn('auths', 'otp', { transaction });
      await queryInterface.removeColumn('auths', 'isDelete', { transaction });
      await queryInterface.removeColumn('auths', 'isActive', { transaction });
      await queryInterface.removeColumn('auths', 'deleteDate', { transaction });
      // Usually we don't remove createdAt and updatedAt in down migration if they are core to the table, but for completeness:
      // await queryInterface.removeColumn('auths', 'updatedAt', { transaction });
      // await queryInterface.removeColumn('auths', 'createdAt', { transaction });
      
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      if (!err.message.includes('does not exist')) {
        throw err;
      }
    }
  }
};
