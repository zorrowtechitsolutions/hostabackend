"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("blood_banks", "roleId", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1, // 👈 temporary default (important if table has data)
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("blood_banks", "roleId");
  },
};