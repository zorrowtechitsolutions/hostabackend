"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {

    const table = await queryInterface.describeTable("role_permissions");

    // ✅ hospitalId
    if (!table.hospitalId) {
      await queryInterface.addColumn("role_permissions", "hospitalId", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    // ✅ labId
    if (!table.labId) {
      await queryInterface.addColumn("role_permissions", "labId", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    // ✅ pharmacyId
    if (!table.pharmacyId) {
      await queryInterface.addColumn("role_permissions", "pharmacyId", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    // ✅ Production-Level Composite Unique Constraint
    // Prevent duplicate permissions

    const indexes = await queryInterface.showIndex("role_permissions");

    const indexExists = indexes.some(
      (index) => index.name === "unique_role_permission_scope"
    );

    if (!indexExists) {
      await queryInterface.addIndex(
        "role_permissions",
        [
          "roleId",
          "permissionId",
          "hospitalId",
          "labId",
          "pharmacyId",
        ],
        {
          unique: true,
          name: "unique_role_permission_scope",
        }
      );
    }
  },

  async down(queryInterface) {

    const table = await queryInterface.describeTable("role_permissions");

    // ✅ Remove index safely
    const indexes = await queryInterface.showIndex("role_permissions");

    const indexExists = indexes.some(
      (index) => index.name === "unique_role_permission_scope"
    );

    if (indexExists) {
      await queryInterface.removeIndex(
        "role_permissions",
        "unique_role_permission_scope"
      );
    }

    // ✅ Remove columns safely
    if (table.pharmacyId) {
      await queryInterface.removeColumn(
        "role_permissions",
        "pharmacyId"
      );
    }

    if (table.labId) {
      await queryInterface.removeColumn(
        "role_permissions",
        "labId"
      );
    }

    if (table.hospitalId) {
      await queryInterface.removeColumn(
        "role_permissions",
        "hospitalId"
      );
    }
  },
};