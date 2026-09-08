

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('specialitys', {
      
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },

      imageUrl: {
        type: Sequelize.STRING,
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
        defaultValue: Sequelize.fn('NOW'),
      },

      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },

      // ❗ ONLY include this if you use paranoid: true
      deletedAt: {
        allowNull: true,
        type: Sequelize.DATE,
      }
    });

    // Index for name (optional but good)
    await queryInterface.addIndex('specialitys', ['name']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('specialitys');
  }
};