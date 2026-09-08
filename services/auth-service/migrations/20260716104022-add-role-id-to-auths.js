'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('auths', 'roleId', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    } catch (e) {
      console.log('Column roleId already exists, skipping.');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('auths', 'roleId');
  },
};





