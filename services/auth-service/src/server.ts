// import app from './app';
// import sequelize from './config/db';
// import dotenv from 'dotenv';
// import { connectRabbitMQ } from './events/publisher';
// import { connectRabbitMQConsumer } from './events/consumer';

// dotenv.config();

// const PORT = process.env.PORT || 5007;

// const startServer = async () => {
//   try {
//     await sequelize.authenticate();
//     console.log('Database connection has been established successfully.');
    
//     // In production, you might want to use migrations instead of sync
//     if (process.env.NODE_ENV !== 'production') {
//       await sequelize.sync({ alter: true }); 
//       console.log('Database synced.');
//     }

//     // Connect RabbitMQ publisher & consumer
//     await connectRabbitMQ();
//     await connectRabbitMQConsumer();
//     console.log('🐰 Auth Service RabbitMQ initialized');

//     app.listen(PORT, () => {
//       console.log(`Auth service running on port ${PORT}`);
//     });
//   } catch (error) {
//     console.error('Unable to start server:', error);
//     process.exit(1);
//   }
// };

// startServer();




import app from './app';
import sequelize from './config/db';
import './models/auditLog.model';
import dotenv from 'dotenv';
import { connectRabbitMQ } from './events/publisher';
import { connectRabbitMQConsumer } from './events/consumer';

dotenv.config();

const PORT = process.env.PORT || 5007;

let rabbitReconnectDelay = 1000;

const startRabbitMQ = async (): Promise<void> => {
  try {
    await connectRabbitMQ();
    await connectRabbitMQConsumer();

    rabbitReconnectDelay = 1000;

    console.log('🐰 Auth Service RabbitMQ initialized');
  } catch (err) {
    console.error('RabbitMQ connection failed:', err);

    console.log(`Retrying RabbitMQ in ${rabbitReconnectDelay / 1000}s`);

    setTimeout(() => {
      startRabbitMQ();
    }, rabbitReconnectDelay);

    rabbitReconnectDelay = Math.min(rabbitReconnectDelay * 2, 30000);
  }
};

const startServer = async () => {
  try {
    // Database is mandatory
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // In production, schema is managed by migrations instead of sync
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('Database synced.');
    } else {
      console.log('ℹ️  Production mode: schema managed by SQL migrations.');
    }

    const server = app.listen(PORT, () => {
      console.log(`🚀 Auth service running on port ${PORT}`);
    });

    // RabbitMQ connects in background — doesn't block server startup
    startRabbitMQ();

    process.on('SIGTERM', async () => {
      console.log('SIGTERM received.');

      server.close(() => {
        console.log('HTTP server closed.');
      });

      process.exit(0);
    });
  } catch (error) {
    console.error('Unable to start Auth Service:', error);
    process.exit(1);
  }
};

startServer();