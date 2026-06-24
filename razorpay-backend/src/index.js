const express = require('express');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const pool = require('./config/db');
const authMiddleware = require('./middleware/auth');
const onboardingRouter = require('./routes/onboarding');
const employeesRouter = require('./routes/employees');
const rolesRouter = require('./routes/roles');

const app = express();
const PORT = process.env.PORT || 7002;

app.use(express.json());
app.use(cookieParser());

app.use('/rest/onboardings', onboardingRouter);
app.use('/rest/employees', employeesRouter);
app.use('/rest/roles', rolesRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.listen(PORT, async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log(`Server running on port ${PORT} and connected to DB`);
  } catch (error) {
    console.error('Failed to connect to DB:', error);
  }
});
