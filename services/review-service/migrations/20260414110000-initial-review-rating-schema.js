'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create 'review' table
    await queryInterface.createTable('review', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

         name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      hospitalId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      doctorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      comment: {
        type: Sequelize.STRING,
        allowNull: false,
      },
       rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE
      }
    });

    

    // Add indexes for ratings

  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('review');
  }
};
