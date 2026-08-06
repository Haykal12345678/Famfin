require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`FamFin backend berjalan di port ${PORT}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} sudah digunakan, nodemon akan menunggu restart.`);
    // don't throw — let nodemon handle restart
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
