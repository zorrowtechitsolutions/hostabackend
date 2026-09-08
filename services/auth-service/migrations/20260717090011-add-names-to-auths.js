'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('auths', 'hospitalName', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      await queryInterface.addColumn('auths', 'doctorName', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      await queryInterface.addColumn('auths', 'staffName', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    } catch (e) {
      console.log('Columns may already exist, skipping.', e.message);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('auths', 'hospitalName');
    await queryInterface.removeColumn('auths', 'doctorName');
    await queryInterface.removeColumn('auths', 'staffName');
  }
};

