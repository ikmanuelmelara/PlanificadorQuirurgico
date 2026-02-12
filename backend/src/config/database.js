const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('MONGODB_URI no definida. La base de datos no esta conectada.');
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log('Conectado a MongoDB Atlas');

    mongoose.connection.on('error', (err) => {
      console.error('Error de conexion MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('Desconectado de MongoDB');
    });
  } catch (err) {
    console.error('Error al conectar a MongoDB:', err.message);
    throw err;
  }
}

module.exports = { connectDB };
