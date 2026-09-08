'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('doctor', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'PENDING',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('doctor', 'status');
  }
};
