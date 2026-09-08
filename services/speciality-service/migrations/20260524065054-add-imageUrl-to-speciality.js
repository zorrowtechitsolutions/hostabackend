'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Only add the imageUrl column if it doesn't already exist
    const tableDescription = await queryInterface.describeTable('specialitys');

    if (!tableDescription.imageUrl) {
      await queryInterface.addColumn('specialitys', 'imageUrl', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('specialitys', 'imageUrl');
  }
};