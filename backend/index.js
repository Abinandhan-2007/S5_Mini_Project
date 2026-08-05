import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JSON_DB_PATH = path.join(__dirname, '../database/database.json');
const INIT_SQL_PATH = path.join(__dirname, '../database/init.sql');

// Initialize JSON database fallback file if not exists
const initJsonDb = () => {
  if (!fs.existsSync(JSON_DB_PATH)) {
    const dbDir = path.dirname(JSON_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const initialData = {
      patients: [
        {
          id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
          full_name: 'Sarah Jenkins',
          email: 'sarah.j@carepulse.com',
          phone: '+91 98765 43210',
          dob: '1995-07-24',
          gender: 'Female',
          blood_group: 'O+'
        }
      ],
      consultations: [
        {
          id: 'c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
          patient_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
          doctor_id: 'doc-1',
          doctor_name: 'Dr. Olivia Wilson',
          date: '2026-07-24',
          soap_data: {
            subjective: "Patient reports mild seasonal allergy symptoms including sneezing and congestion.",
            objective: "Clear nasal discharge, no wheezing, clear breath sounds, normal temperature.",
            assessment: "Allergic Rhinitis.",
            plan: "Prescribed Cetirizine 10mg once daily as needed. Recommended avoidance of known environmental allergens.",
            vitals: {
              bp: "118/76",
              heart_rate: 72,
              temperature: 98.4
            }
          },
          soap_embedding: []
        }
      ]
    };
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(initialData, null, 2));
  }
};

initJsonDb();

// Helper functions for local JSON DB
const readJsonDb = () => {
  try {
    const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return { patients: [], consultations: [] };
  }
};

const writeJsonDb = (data) => {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
};

// Vector math helper: Cosine similarity for RAG search
const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// PostgreSQL Connection Config
const dbConfig = {
  user: process.env.DB_USER || 'carepulse_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'carepulse_db',
  password: process.env.DB_PASSWORD || 'carepulse_secure_password',
  port: parseInt(process.env.DB_PORT || '5432'),
  connectionTimeoutMillis: 2000
};

let pgPool = null;
let usePg = false;

const tryConnectPg = async () => {
  try {
    pgPool = new pg.Pool(dbConfig);
    await pgPool.query('SELECT NOW()');
    
    if (fs.existsSync(INIT_SQL_PATH)) {
      const sql = fs.readFileSync(INIT_SQL_PATH, 'utf8');
      await pgPool.query(sql);
    }
    
    usePg = true;
    console.log('✅ PostgreSQL Database connected successfully with JSONB and pgvector');
  } catch (err) {
    console.log('⚠️ PostgreSQL database is not running (Docker is down). Falling back to database/database.json local file store.');
    usePg = false;
  }
};

// Start Express API
app.listen(PORT, async () => {
  console.log(`🚀 CarePulse Backend Service running on port ${PORT}`);
  await tryConnectPg();
});

// API Routes

// 1. Get Consultations Lists (retrieves SOAP data from JSONB/JSON column)
app.get('/api/consultations', async (req, res) => {
  if (usePg) {
    try {
      const result = await pgPool.query(`
        SELECT c.id, c.doctor_id, c.doctor_name, c.date, c.soap_data, p.full_name as patient_name
        FROM consultations c
        JOIN patients p ON c.patient_id = p.id
        ORDER BY c.date DESC
      `);
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = readJsonDb();
    const joined = db.consultations.map(c => {
      const patient = db.patients.find(p => p.id === c.patient_id);
      return {
        id: c.id,
        doctor_id: c.doctor_id,
        doctor_name: c.doctor_name,
        date: c.date,
        soap_data: c.soap_data,
        patient_name: patient ? patient.full_name : 'Unknown Patient'
      };
    });
    return res.json(joined.reverse());
  }
});

// 2. Create Consultation (saves SOAP data as JSONB and optional vector embeddings)
app.post('/api/consultations', async (req, res) => {
  const { patientId, doctorId, doctorName, date, soapData, soapEmbedding } = req.body;
  
  if (usePg) {
    try {
      let queryParams = [patientId, doctorId, doctorName, date, JSON.stringify(soapData)];
      if (soapEmbedding && Array.isArray(soapEmbedding)) {
        const vectorStr = `[${soapEmbedding.join(',')}]`;
        queryParams.push(vectorStr);
        const query = `
          INSERT INTO consultations (patient_id, doctor_id, doctor_name, date, soap_data, soap_embedding)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, doctor_name, date, soap_data
        `;
        const result = await pgPool.query(query, queryParams);
        return res.status(201).json(result.rows[0]);
      } else {
        const query = `
          INSERT INTO consultations (patient_id, doctor_id, doctor_name, date, soap_data)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, doctor_name, date, soap_data
        `;
        const result = await pgPool.query(query, queryParams);
        return res.status(201).json(result.rows[0]);
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = readJsonDb();
    const newRecord = {
      id: `c-${Date.now()}`,
      patient_id: patientId || 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      doctor_id: doctorId,
      doctor_name: doctorName,
      date: date || new Date().toISOString().split('T')[0],
      soap_data: soapData || {},
      soap_embedding: soapEmbedding || []
    };
    db.consultations.push(newRecord);
    writeJsonDb(db);
    return res.status(201).json({
      id: newRecord.id,
      doctor_name: newRecord.doctor_name,
      date: newRecord.date,
      soap_data: newRecord.soap_data
    });
  }
});

// 3. AI / RAG Vector Similarity Search (uses pgvector '<=>' cosine distance)
app.post('/api/consultations/search', async (req, res) => {
  const { queryEmbedding, limit = 5 } = req.body;
  if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
    return res.status(400).json({ error: 'queryEmbedding must be a numeric array.' });
  }

  if (usePg) {
    try {
      const vectorStr = `[${queryEmbedding.join(',')}]`;
      const query = `
        SELECT c.id, c.doctor_name, c.date, c.soap_data,
               (c.soap_embedding <=> $1) as distance
        FROM consultations c
        WHERE c.soap_embedding IS NOT NULL
        ORDER BY c.soap_embedding <=> $1
        LIMIT $2
      `;
      const result = await pgPool.query(query, [vectorStr, limit]);
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = readJsonDb();
    const matched = db.consultations
      .filter(c => c.soap_embedding && c.soap_embedding.length > 0)
      .map(c => {
        const similarity = cosineSimilarity(queryEmbedding, c.soap_embedding);
        const distance = 1 - similarity;
        return {
          id: c.id,
          doctor_name: c.doctor_name,
          date: c.date,
          soap_data: c.soap_data,
          distance
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
    return res.json(matched);
  }
});
