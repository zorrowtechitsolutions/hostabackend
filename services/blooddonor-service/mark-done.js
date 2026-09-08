const { default: sequelize } = require('./src/config/db');

async function mark() {
  try {
    await sequelize.authenticate();
    await sequelize.query(`
      INSERT INTO "SequelizeMeta" (name) VALUES 
      ('20260402092200-initial-schema.js'), 
      ('20260403105149-add-deleted-at-paranoid-to-models.js'), 
      ('20260410145000-add-deleted-at-to-blood_donors.js'), 
      ('20260418100900-add-otp-fields-to-blood-donors.js'), 
      ('20260424131500-add-userId-to-blood-donors.js'), 
      ('20260516050919-add-name-to-blood-donors.js') 
      ON CONFLICT DO NOTHING;
    `);
    console.log('Fixed migrations!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

mark();
