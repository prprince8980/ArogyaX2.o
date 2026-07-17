import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5004;

app.use(cors());
app.use(express.json());

app.get('/api/hospital/health', (req, res) => {
  res.json({ status: 'Hospital backend is running' });
});

app.get('/api/hospital', (req, res) => {
  res.json({ message: 'Hospital module ready' });
});

app.listen(PORT, () => {
  console.log(`Hospital backend running on port ${PORT}`);
});
