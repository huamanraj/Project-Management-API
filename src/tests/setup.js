const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set test environment
process.env.NODE_ENV = 'test';

let mongoServer;

// Setup test database before running tests
beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
    
    console.log('Test database connected');
  } catch (error) {
    console.error('Test database connection error:', error);
    throw error;
  }
}, 60000); // 60 second timeout for MongoDB setup

// Clean up after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    console.log('Test database disconnected');
  } catch (error) {
    console.error('Test cleanup error:', error);
  }
});