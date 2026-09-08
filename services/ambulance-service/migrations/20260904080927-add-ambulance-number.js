'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Check existing ambulanceNumber values
      const [ambulances] = await queryInterface.sequelize.query(
        `
        SELECT "id", "hospitalId", "ambulanceNumber"
        FROM "ambulances"
        ORDER BY "hospitalId" ASC NULLS LAST, "id" ASC
        `,
        { transaction }
      );

      const counters = {};

      // 2. Generate ambulanceNumber for existing records
      for (const ambulance of ambulances) {
        if (!ambulance.hospitalId) {
          await queryInterface.sequelize.query(
            `
            UPDATE "ambulances"
            SET "ambulanceNumber" = :ambulanceNumber
            WHERE "id" = :ambulanceId
            `,
            {
              replacements: {
                ambulanceNumber: ambulance.id,
                ambulanceId: ambulance.id,
              },
              transaction,
            }
          );

          continue;
        }

        const hospitalId = ambulance.hospitalId;

        counters[hospitalId] = (counters[hospitalId] || 0) + 1;

        await queryInterface.sequelize.query(
          `
          UPDATE "ambulances"
          SET "ambulanceNumber" = :ambulanceNumber
          WHERE "id" = :ambulanceId
          `,
          {
            replacements: {
              ambulanceNumber: counters[hospitalId],
              ambulanceId: ambulance.id,
            },
            transaction,
          }
        );
      }

      // 3. Make ambulanceNumber NOT NULL
      await queryInterface.changeColumn(
        'ambulances',
        'ambulanceNumber',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        { transaction }
      );

      // 4. Add unique constraint
      await queryInterface.addConstraint('ambulances', {
        fields: ['hospitalId', 'ambulanceNumber'],
        type: 'unique',
        name: 'ambulances_hospital_id_ambulance_number_unique',
        transaction,
      });

      await transaction.commit();

      console.log('Ambulance number migration completed successfully.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'ambulances',
      'ambulances_hospital_id_ambulance_number_unique'
    );

    await queryInterface.removeColumn(
      'ambulances',
      'ambulanceNumber'
    );
  },
};