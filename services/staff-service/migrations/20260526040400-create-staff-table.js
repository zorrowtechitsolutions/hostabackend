"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("staff", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      hospitalId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      staffId: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      designation: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      joiningDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      staffType: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      jobType: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      qualification: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      phone: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },

      email: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },

      password: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      gender: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      dob: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      knowLanguages: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      roleId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },

      address: {
        type: Sequelize.JSONB,
        allowNull: false,
      },

      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },

      isDelete: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },

      deleteDate: {
        type: Sequelize.DATE,
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
      hospitalName: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "thasni",
      },
      fcmToken: {
        type: Sequelize.STRING
      },
    });

    // Indexes (IMPORTANT for performance)
    await queryInterface.addIndex("staff", ["phone"], {
      unique: true,
      name: "staff_phone_unique",
    });

    await queryInterface.addIndex("staff", ["email"], {
      unique: true,
      name: "staff_email_unique",
    });

    await queryInterface.addIndex("staff", ["hospitalId"], {
      name: "staff_hospital_index",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("staff");
  },
};