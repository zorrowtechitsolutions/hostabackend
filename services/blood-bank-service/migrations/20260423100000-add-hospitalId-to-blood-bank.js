"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("blood_banks");

    // 1. Add hospitalId column
    if (!tableInfo.hospitalId) {
      await queryInterface.addColumn("blood_banks", "hospitalId", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      });
    }

    // 2. Add isDelete column for soft deletes
    if (!tableInfo.isDelete) {
      await queryInterface.addColumn("blood_banks", "isDelete", {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      });
    }

    // 3. Add deletedAt for paranoid mode
    if (!tableInfo.deletedAt) {
      await queryInterface.addColumn("blood_banks", "deletedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // 4. Remove old unique constraint on bloodGroup
    try {
      await queryInterface.removeConstraint("blood_banks", "blood_banks_bloodGroup_key");
    } catch (err) {
      console.log("Note: Could not remove blood_banks_bloodGroup_key.");
    }

    // 5. Add composite unique index [hospitalId, bloodGroup]
    try {
      await queryInterface.addIndex("blood_banks", ["hospitalId", "bloodGroup"], {
        unique: true,
        name: "blood_banks_hospital_blood_group_unique",
      });
    } catch (err) {
      console.log("Note: Index blood_banks_hospital_blood_group_unique might already exist.");
    }
  },

  async down(queryInterface, Sequelize) {
    try { await queryInterface.removeIndex("blood_banks", "blood_banks_hospital_blood_group_unique"); } catch (e) {}
    try { await queryInterface.removeColumn("blood_banks", "hospitalId"); } catch (e) {}
    try { await queryInterface.removeColumn("blood_banks", "isDelete"); } catch (e) {}
    try { await queryInterface.removeColumn("blood_banks", "deletedAt"); } catch (e) {}
  },
};
