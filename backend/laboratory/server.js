import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5003;

app.use(cors());
app.use(express.json());

app.get('/api/laboratory/health', (req, res) => {
  res.json({ status: 'Laboratory backend is running' });
});

app.get('/api/laboratory', (req, res) => {
  res.json({ message: 'Laboratory module ready' });
});

app.listen(PORT, () => {
  console.log(`Laboratory backend running on port ${PORT}`);
});
