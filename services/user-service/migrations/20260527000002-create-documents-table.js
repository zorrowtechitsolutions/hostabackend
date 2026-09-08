"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let tableInfo;

    try {
      tableInfo = await queryInterface.describeTable("documents");
    } catch (error) {
      tableInfo = null;
    }

    if (!tableInfo) {
      await queryInterface.createTable("documents", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        patientId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        date: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        imageUrl: {
          type: Sequelize.TEXT,
          allowNull: true,
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

      await queryInterface.addIndex("documents", ["patientId"]);
      await queryInterface.addIndex("documents", ["date"]);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("documents");
  },
};
