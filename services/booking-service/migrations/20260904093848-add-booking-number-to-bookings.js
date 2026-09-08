'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add nullable first
    await queryInterface.addColumn('bookings', 'bookingNumber', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    const transaction =
      await queryInterface.sequelize.transaction();

    try {
      // 2. Get existing bookings
      const [bookings] =
        await queryInterface.sequelize.query(
          `
          SELECT "id", "hospitalId"
          FROM "bookings"
          WHERE "hospitalId" IS NOT NULL
          ORDER BY "hospitalId" ASC, "id" ASC
          `,
          {
            transaction,
          }
        );

      const counters = {};

      // 3. Generate booking number per hospital
      for (const booking of bookings) {
        const hospitalId = booking.hospitalId;

        if (!counters[hospitalId]) {
          counters[hospitalId] = 1;
        } else {
          counters[hospitalId]++;
        }

        await queryInterface.sequelize.query(
          `
          UPDATE "bookings"
          SET "bookingNumber" = :bookingNumber
          WHERE "id" = :id
          `,
          {
            replacements: {
              bookingNumber: counters[hospitalId],
              id: booking.id,
            },
            transaction,
          }
        );
      }

      // 4. Make it NOT NULL
      await queryInterface.changeColumn(
        'bookings',
        'bookingNumber',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        {
          transaction,
        }
      );

      // 5. Unique per hospital
      await queryInterface.addConstraint('bookings', {
        fields: ['hospitalId', 'bookingNumber'],
        type: 'unique',
        name: 'bookings_hospital_id_booking_number_unique',
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
      'bookings',
      'bookings_hospital_id_booking_number_unique'
    );

    await queryInterface.removeColumn(
      'bookings',
      'bookingNumber'
    );
  },
};