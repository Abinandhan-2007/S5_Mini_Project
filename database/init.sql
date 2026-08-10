-- Enable the pgvector extension for AI RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) DEFAULT '',
    dob DATE DEFAULT CURRENT_DATE,
    gender VARCHAR(50) DEFAULT 'Not specified',
    blood_group VARCHAR(10) DEFAULT 'O+',
    avatar_url TEXT DEFAULT '',
    google_id VARCHAR(255) UNIQUE,
    auth_provider VARCHAR(50) DEFAULT 'local',
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migration support if table already exists
ALTER TABLE patients ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE patients ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE patients ALTER COLUMN dob DROP NOT NULL;

-- Consultations Table with JSONB and pgvector
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id VARCHAR(100) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    
    -- JSONB column containing structured SOAP clinical logs
    soap_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- pgvector column for embeddings of the SOAP notes
    soap_embedding vector(1536), 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_consultations_soap_data ON consultations USING gin (soap_data);
CREATE INDEX IF NOT EXISTS idx_consultations_embedding ON consultations USING hnsw (soap_embedding vector_cosine_ops);

-- Insert Mock Patient and Consultation if empty
INSERT INTO patients (id, full_name, email, phone, dob, gender, blood_group)
VALUES ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Sarah Jenkins', 'sarah.j@carepulse.com', '+91 98765 43210', '1995-07-24', 'Female', 'O+')
ON CONFLICT (email) DO NOTHING;

INSERT INTO consultations (patient_id, doctor_id, doctor_name, date, soap_data)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'doc-1',
    'Dr. Olivia Wilson',
    '2026-07-24',
    '{
        "subjective": "Patient reports mild seasonal allergy symptoms including sneezing and congestion.",
        "objective": "Clear nasal discharge, no wheezing, clear breath sounds, normal temperature.",
        "assessment": "Allergic Rhinitis.",
        "plan": "Prescribed Cetirizine 10mg once daily as needed. Recommended avoidance of known environmental allergens.",
        "vitals": {
            "bp": "118/76",
            "heart_rate": 72,
            "temperature": 98.4
        }
    }'::json
) ON CONFLICT DO NOTHING;
