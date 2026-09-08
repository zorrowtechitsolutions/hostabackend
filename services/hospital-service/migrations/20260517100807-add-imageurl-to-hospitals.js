"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("hospitals");

    if (!table.imageUrl) {
      await queryInterface.addColumn("hospitals", "imageUrl", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("hospitals");

    if (table.imageUrl) {
      await queryInterface.removeColumn("hospitals", "imageUrl");
    }
  },
};


