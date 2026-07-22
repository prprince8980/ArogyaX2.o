import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get('/api/patient/health', (req, res) => {
  res.json({ status: 'Patient backend is running' });
});

app.get('/api/patient', (req, res) => {
  res.json({ message: 'Patient module ready' });
});

app.get('/ping', (req, res) => {
  res.json({ status: 'alive', module: 'patient', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Patient backend running on port ${PORT}`);
  setInterval(() => {
    const targetUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    fetch(`${targetUrl}/ping`).catch(() => {});
  }, 60000);
});
