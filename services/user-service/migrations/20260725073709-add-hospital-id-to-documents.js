"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("documents", "hospitalId", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1, // temporary for existing rows
    });

    await queryInterface.addIndex("documents", ["hospitalId"]);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("documents", ["hospitalId"]);
    await queryInterface.removeColumn("documents", "hospitalId");
  },
};