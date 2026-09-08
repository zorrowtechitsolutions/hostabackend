"use strict";

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("bookings", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      patient_name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },

      patient_phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },

      patient_place: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },

      patient_dob: {
        type: Sequelize.STRING,
        allowNull: true,
      },


      hospitalName: {
        type: Sequelize.STRING,
      },

      patient_age: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      patient_gender: {
        type: Sequelize.ENUM("Male", "Female", "Other"),
        allowNull: true,
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      doctorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      hospitalId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      booking_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      consulting_time: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      doctor_name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },

      doctor_department: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },

      token: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      status: {
        type: Sequelize.ENUM(
          "pending",
          "accepted",
          "declined",
          "completed",
          "cancel",
        ),
        allowNull: false,
        defaultValue: "pending",
      },

      booking_status: {
        type: Sequelize.ENUM("user booking", "hospital booking"),
        allowNull: false,
        defaultValue: "user booking",
      },

      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    const existingIndexes = await queryInterface.sequelize.query(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'bookings'",
      { type: Sequelize.QueryTypes.SELECT },
    );

    const existingIndexNames = new Set(
      existingIndexes.map((row) => row.indexname),
    );

    const addIndexIfMissing = async (fields, indexName) => {
      if (existingIndexNames.has(indexName)) {
        return;
      }

      await queryInterface.addIndex("bookings", fields, { name: indexName });
      existingIndexNames.add(indexName);
    };

    await addIndexIfMissing(["doctorId"], "bookings_doctor_id");
    await addIndexIfMissing(["hospitalId"], "bookings_hospital_id");
    await addIndexIfMissing(["userId"], "bookings_user_id");
    await addIndexIfMissing(["booking_date"], "bookings_booking_date");
    await addIndexIfMissing(["status"], "bookings_status");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("bookings");
  },
};
