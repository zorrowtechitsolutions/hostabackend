"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false,
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

      phone: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },

      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      fcmToken: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      joinAccountId: {
        type: Sequelize.INTEGER,
        allowNull: true,

        references: {
          model: "users",
          key: "id",
        },

        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      relationType: {
        type: Sequelize.ENUM(
          "mother",
          "father",
          "guardian"
        ),
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

      roleId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 3,
      },

      deleteDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },

      isDelete: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("users");

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_users_relationType";'
    );
  },
};