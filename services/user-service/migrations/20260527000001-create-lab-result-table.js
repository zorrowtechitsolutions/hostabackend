"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let tableInfo;

    try {
      tableInfo = await queryInterface.describeTable("lab_result");
    } catch (error) {
      tableInfo = null;
    }

    if (!tableInfo) {
      await queryInterface.createTable("lab_result", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        labId: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        hospitalId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        patientId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        doctorId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        department: {
          type: Sequelize.STRING(120),
          allowNull: false,
        },
        testName: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        imageUrl: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM("received", "progress", "pending"),
          allowNull: false,
          defaultValue: "pending",
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
      });

      await queryInterface.addIndex("lab_result", ["labId"]);
      await queryInterface.addIndex("lab_result", ["hospitalId"]);
      await queryInterface.addIndex("lab_result", ["patientId"]);
      await queryInterface.addIndex("lab_result", ["doctorId"]);
      await queryInterface.addIndex("lab_result", ["status"]);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("lab_result");
  },
};
