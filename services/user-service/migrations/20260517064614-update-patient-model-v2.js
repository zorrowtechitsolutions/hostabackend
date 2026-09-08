'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    // =========================
    // ADD NEW COLUMNS
    // =========================

    let table;
    try {
      table = await queryInterface.describeTable('patients');
    } catch (error) {
      console.log('Skipping migration for missing table: patients');
      return;
    }

    // hospitalId
    if (!table.hospitalId) {
      await queryInterface.addColumn('patients', 'hospitalId', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    // addressLine
    if (!table.addressLine) {
      await queryInterface.addColumn('patients', 'addressLine', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    // location
    if (!table.location) {
      await queryInterface.addColumn('patients', 'location', {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }

    // =========================
    // REMOVE OLD COLUMNS
    // =========================

    const removeColumns = [
      'middleName',
      'profileImage',
      'company',

      'addressLine1',
      'addressLine2',

      'country',
      'city',
      'state',
      'pinCode',

      'referredBy',
      'department',
      'referredOn',

      'notes'
    ];

    for (const column of removeColumns) {
      const updatedTable = await queryInterface.describeTable('patients');

      if (updatedTable[column]) {
        await queryInterface.removeColumn('patients', column);
      }
    }

    // =========================
    // CHANGE NULL CONSTRAINTS
    // =========================

    await queryInterface.changeColumn('patients', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.changeColumn('patients', 'age', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.changeColumn('patients', 'dob', {
      type: Sequelize.DATE,
      allowNull: false,
    });

  },

  async down(queryInterface, Sequelize) {

    // =========================
    // REMOVE NEW COLUMNS
    // =========================

    const table = await queryInterface.describeTable('patients');

    if (table.hospitalId) {
      await queryInterface.removeColumn('patients', 'hospitalId');
    }

    if (table.addressLine) {
      await queryInterface.removeColumn('patients', 'addressLine');
    }

    if (table.location) {
      await queryInterface.removeColumn('patients', 'location');
    }

    // =========================
    // ADD OLD COLUMNS BACK
    // =========================

    const oldColumns = {
      middleName: Sequelize.STRING,
      company: Sequelize.STRING,
      addressLine1: Sequelize.STRING,
      addressLine2: Sequelize.STRING,
      country: Sequelize.STRING,
      city: Sequelize.STRING,
      state: Sequelize.STRING,
      pinCode: Sequelize.STRING,
      referredBy: Sequelize.INTEGER,
      department: Sequelize.INTEGER,
      referredOn: Sequelize.DATE,
      notes: Sequelize.TEXT,
      profileImage: Sequelize.JSONB,
    };

    for (const key in oldColumns) {
      const updatedTable = await queryInterface.describeTable('patients');

      if (!updatedTable[key]) {
        await queryInterface.addColumn('patients', key, {
          type: oldColumns[key],
          allowNull: true,
        });
      }
    }

    // revert nullable
    await queryInterface.changeColumn('patients', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

  }
};