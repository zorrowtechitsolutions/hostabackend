'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add as nullable first because existing rows already exist
    await queryInterface.addColumn('blood_banks', 'stockNumber', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Get existing records
      const [stocks] = await queryInterface.sequelize.query(
        `
        SELECT "id", "hospitalId"
        FROM "blood_banks"
        ORDER BY "hospitalId" ASC, "id" ASC
        `,
        {
          transaction,
        }
      );

      const counters = {};

      // Generate stockNumber per hospital
      for (const stock of stocks) {
        const hospitalId = stock.hospitalId;

        if (!counters[hospitalId]) {
          counters[hospitalId] = 1;
        } else {
          counters[hospitalId]++;
        }

        await queryInterface.sequelize.query(
          `
          UPDATE "blood_banks"
          SET "stockNumber" = :stockNumber
          WHERE "id" = :id
          `,
          {
            replacements: {
              stockNumber: counters[hospitalId],
              id: stock.id,
            },
            transaction,
          }
        );
      }

      // Make stockNumber mandatory
      await queryInterface.changeColumn(
        'blood_banks',
        'stockNumber',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        {
          transaction,
        }
      );

      // Unique stock number within each hospital
      await queryInterface.addConstraint('blood_banks', {
        fields: ['hospitalId', 'stockNumber'],
        type: 'unique',
        name: 'blood_banks_hospital_id_stock_number_unique',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'blood_banks',
      'blood_banks_hospital_id_stock_number_unique'
    );

    await queryInterface.removeColumn(
      'blood_banks',
      'stockNumber'
    );
  },
};