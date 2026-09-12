const { Sequelize, QueryTypes } = require("sequelize");

const sequelize = new Sequelize("postgresql://hosta_user:Hosta%40123@35.174.10.32:5432/user_db", {
  dialect: "postgres",
  logging: false,
});

async function main() {
  try {
    await sequelize.authenticate();
    console.log("Connected to the DB (user_db).");

    // 1. Add the missing column (if it doesn't exist)
    try {
      await sequelize.query('ALTER TABLE prescriptions ADD COLUMN "prescriptionNumber" INTEGER;');
      console.log("Column prescriptionNumber added successfully.");
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log("Column prescriptionNumber already exists.");
      } else {
        throw error;
      }
    }

    // 2. Backfill existing prescriptions
    // For each hospital, assign prescriptionNumbers sequentially based on id or createdAt
    const hospitals = await sequelize.query('SELECT DISTINCT "hospitalId" FROM prescriptions', { type: QueryTypes.SELECT });
    
    let totalUpdated = 0;
    
    for (const h of hospitals) {
      const hospitalId = h.hospitalId;
      console.log(`Backfilling prescriptions for hospital ${hospitalId}...`);
      
      const prescriptions = await sequelize.query(
        'SELECT id FROM prescriptions WHERE "hospitalId" = :hospitalId ORDER BY "createdAt" ASC',
        { replacements: { hospitalId }, type: QueryTypes.SELECT }
      );
      
      let pNum = 1;
      for (const p of prescriptions) {
        await sequelize.query(
          'UPDATE prescriptions SET "prescriptionNumber" = :pNum WHERE id = :id',
          { replacements: { pNum, id: p.id }, type: QueryTypes.UPDATE }
        );
        pNum++;
        totalUpdated++;
      }
    }
    
    console.log(`Backfill complete. Updated ${totalUpdated} prescriptions.`);

    // 3. Make column NOT NULL (optional, but good for data integrity since we set allowNull: false in model, wait, I set it to true in the model temporarily. Let's make it NOT NULL here so it matches the final state, and I can update the model back to false later if needed).
    try {
      await sequelize.query('ALTER TABLE prescriptions ALTER COLUMN "prescriptionNumber" SET NOT NULL;');
      console.log("Column prescriptionNumber is now NOT NULL.");
    } catch(e) {
      console.log("Could not set NOT NULL. (Maybe some rows still have nulls?)", e.message);
    }

  } catch (error) {
    console.error("Error modifying database:", error);
  } finally {
    await sequelize.close();
  }
}

main();
