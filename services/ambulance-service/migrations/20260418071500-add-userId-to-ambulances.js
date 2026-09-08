"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ambulances", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      serviceName: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      phone: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },

      vehicleType: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      address: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      hospitalId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      otp: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      otpExpiry: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },

      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    // Indexes (important for performance)
    await queryInterface.addIndex("ambulances", ["phone"], {
      unique: true,
      name: "ambulances_phone_unique",
    });

    await queryInterface.addIndex("ambulances", ["hospitalId"], {
      name: "ambulances_hospital_index",
    });

    await queryInterface.addIndex("ambulances", ["userId"], {
      name: "ambulances_user_index",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("ambulances");
  },
};