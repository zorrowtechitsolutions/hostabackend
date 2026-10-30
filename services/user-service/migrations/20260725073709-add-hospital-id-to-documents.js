"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("documents");
    if (!tableInfo.hospitalId) {
      await queryInterface.addColumn("documents", "hospitalId", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1, // temporary for existing rows
      });

      await queryInterface.addIndex("documents", ["hospitalId"]).catch(() => {});
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable("documents");
    if (tableInfo.hospitalId) {
      await queryInterface.removeIndex("documents", ["hospitalId"]).catch(() => {});
      await queryInterface.removeColumn("documents", "hospitalId");
    }
  },
};