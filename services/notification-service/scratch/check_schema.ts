
import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL!, {
    dialect: 'postgres',
    logging: false,
});

async function checkSchema() {
    try {
        const [results] = await sequelize.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'notifications';
        `);
        console.log("TABLE COLUMNS:", JSON.stringify(results, null, 2));
    } catch (err) {
        console.error("ERROR CHECKING SCHEMA:", err);
    } finally {
        await sequelize.close();
    }
}

checkSchema();
