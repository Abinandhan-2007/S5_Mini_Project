-- ===================================================================
-- CarePulse Database Schema Migration & Seed Data Script
-- ===================================================================

-- 1. Patients Table Migration & Seed
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

ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS dob DATE DEFAULT CURRENT_DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender VARCHAR(50) DEFAULT 'Not specified';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10) DEFAULT 'O+';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

INSERT INTO patients (id, full_name, email, phone, dob, gender, blood_group, avatar_url, auth_provider, password_hash)
VALUES
    ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Sarah Jenkins', 'sarah.j@carepulse.com', '+91 98765 43210', '1995-07-24', 'Female', 'O+', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80', 'local', 'password123'),
    ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Robert Chen', 'robert.chen@example.com', '+91 98111 22334', '1988-11-15', 'Male', 'A+', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80', 'local', 'password123'),
    ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Anita Sharma', 'anita.s@example.com', '+91 99887 76655', '1992-03-30', 'Female', 'B+', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80', 'local', 'password123'),
    ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'Michael Scott', 'michael.s@example.com', '+91 91234 56789', '1980-06-12', 'Male', 'AB+', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80', 'local', 'password123')
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;


-- 2. Hospitals Table Migration & Seed
CREATE TABLE IF NOT EXISTS hospitals (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50),
    rating DECIMAL(3, 1) DEFAULT 4.8,
    reviews_count INT DEFAULT 1500,
    emergency_available BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    specialties JSONB DEFAULT '["General", "Emergency Care"]'::jsonb,
    facility_type VARCHAR(100) DEFAULT 'General',
    distance_miles DECIMAL(4, 1) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 1) DEFAULT 4.8;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS reviews_count INT DEFAULT 1500;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS emergency_available BOOLEAN DEFAULT TRUE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS specialties JSONB DEFAULT '["General", "Emergency Care"]'::jsonb;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS facility_type VARCHAR(100) DEFAULT 'General';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS distance_miles DECIMAL(4, 1) DEFAULT 1.0;

INSERT INTO hospitals (id, name, address, phone, rating, reviews_count, emergency_available, image_url, specialties, facility_type, distance_miles)
VALUES
    ('hosp-1', 'St. Jude Heart & Medical Center', '742 Evergreen Terrace, Downtown', '+91 80 2345 6789', 4.9, 2420, TRUE, 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80', '["Cardiology", "General Medicine", "Surgery", "Pediatrics"]'::jsonb, 'Cardiology', 0.8),
    ('hosp-2', 'Metropolitan General Hospital', '1200 Grand Avenue, Midtown', '+91 80 4455 6677', 4.8, 1850, TRUE, 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80', '["General", "Emergency Care", "Orthopedics", "Neurology"]'::jsonb, 'General', 1.4),
    ('hosp-3', 'Cedar Skin & Wellness Clinic', '450 University Blvd, Westside', '+91 80 9988 1122', 4.7, 940, FALSE, 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80', '["Dermatology", "Wellness", "Allergy"]'::jsonb, 'Specialty Clinic', 2.1),
    ('hosp-4', 'Children & Family Care Center', '88 Peak Street, Northside', '+91 80 7766 5544', 4.9, 3100, TRUE, 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80', '["Pediatrics", "Neonatology", "General"]'::jsonb, 'Pediatrics', 3.5)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, address = EXCLUDED.address, phone = EXCLUDED.phone, rating = EXCLUDED.rating, image_url = EXCLUDED.image_url, specialties = EXCLUDED.specialties;


-- 3. Doctors Table Migration & Seed
CREATE TABLE IF NOT EXISTS doctors (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255) NOT NULL,
    department VARCHAR(255) DEFAULT 'General Medicine',
    hospital_id VARCHAR(100),
    hospital_name VARCHAR(255) DEFAULT 'St. Jude Heart & Medical Center',
    experience_years INT DEFAULT 5,
    consultation_fee DECIMAL(10, 2) DEFAULT 500.0,
    phone VARCHAR(50),
    email VARCHAR(255),
    room_number VARCHAR(100),
    is_available BOOLEAN DEFAULT TRUE,
    photo TEXT,
    rating DECIMAL(3, 1) DEFAULT 4.8,
    reviews_count INT DEFAULT 85,
    about TEXT,
    available_days JSONB DEFAULT '["Mon", "Tue", "Wed", "Thu", "Fri"]'::jsonb,
    slot_capacities JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS department VARCHAR(255) DEFAULT 'General Medicine';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(255) DEFAULT 'St. Jude Heart & Medical Center';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 5;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10, 2) DEFAULT 500.0;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS room_number VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS photo TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 1) DEFAULT 4.8;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS reviews_count INT DEFAULT 85;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS about TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS available_days JSONB DEFAULT '["Mon", "Tue", "Wed", "Thu", "Fri"]'::jsonb;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS slot_capacities JSONB DEFAULT '[]'::jsonb;

INSERT INTO doctors (id, name, specialty, department, hospital_id, hospital_name, experience_years, consultation_fee, phone, email, room_number, is_available, photo, rating, reviews_count, about)
VALUES
    ('doc-johan', 'Dr. Johan Janson', 'Endocrinologist', 'Endocrinology', 'hosp-1', 'St. Jude Heart & Medical Center', 8, 850.0, '+91 98765 11001', 'johan.j@carepulse.com', 'Cabin 102 - 1st Floor', TRUE, 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80', 4.5, 85, 'Specialist in metabolic health, diabetes management, and endocrine disorders.'),
    ('doc-marilyn', 'Dr. Marilyn Stanton', 'General Physician', 'General Medicine', 'hosp-1', 'St. Jude Heart & Medical Center', 10, 600.0, '+91 98765 11002', 'marilyn.s@carepulse.com', 'Cabin 104 - 1st Floor', TRUE, 'https://images.unsplash.com/photo-1594824813566-88855ce78347?w=400&auto=format&fit=crop&q=80', 5.0, 92, 'Primary care physician focused on preventive health & comprehensive checkups.'),
    ('doc-marvin', 'Dr. Marvin McKinney', 'Cardiologist', 'Cardiology', 'hosp-1', 'St. Jude Heart & Medical Center', 14, 1100.0, '+91 98765 11003', 'marvin.m@carepulse.com', 'Cabin 201 - 2nd Floor', TRUE, 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&auto=format&fit=crop&q=80', 4.3, 110, 'Senior Cardiologist specializing in preventive heart health and electrophysiology.'),
    ('doc-arlene', 'Dr. Arlene McCoy', 'Physician', 'Internal Medicine', 'hosp-1', 'St. Jude Heart & Medical Center', 11, 750.0, '+91 98765 11004', 'arlene.m@carepulse.com', 'Cabin 203 - 2nd Floor', TRUE, 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80', 4.5, 78, 'Internal medicine specialist dedicated to holistic patient care.'),
    ('doc-eleanor', 'Dr. Eleanor Pena', 'Arthropathic', 'Orthopedics', 'hosp-1', 'St. Jude Heart & Medical Center', 9, 900.0, '+91 98765 11005', 'eleanor.p@carepulse.com', 'Cabin 302 - 3rd Floor', TRUE, 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80', 4.4, 88, 'Specialist in joint health, rheumatoid care, and orthopedic therapy.'),
    ('doc-kaiya', 'Dr. Kaiya Donin', 'Endocrinologist', 'Endocrinology', 'hosp-1', 'St. Jude Heart & Medical Center', 12, 950.0, '+91 98765 11006', 'kaiya.d@carepulse.com', 'Cabin 305 - 3rd Floor', TRUE, 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80', 5.0, 105, 'Endocrine care expert specializing in thyroid & metabolic health.'),
    ('doc-1', 'Dr. Olivia Wilson', 'Cardiologist', 'Cardiology', 'hosp-1', 'St. Jude Heart & Medical Center', 12, 850.0, '+91 98765 11007', 'olivia.w@carepulse.com', 'Cabin 101 - 1st Floor', TRUE, 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80', 4.9, 142, 'Lead Cardiologist specializing in heart disease prevention and non-invasive cardiac imaging.'),
    ('doc-2', 'Dr. Marcus Vance', 'Dermatologist', 'Dermatology', 'hosp-3', 'Cedar Skin & Wellness Clinic', 9, 700.0, '+91 98765 11008', 'marcus.v@carepulse.com', 'Cabin 204 - 2nd Floor', TRUE, 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80', 4.7, 95, 'Board-certified dermatologist with clinical expertise in clinical aesthetics and laser therapy.'),
    ('doc-3', 'Dr. Sophia Patel', 'Pediatrician', 'Pediatrics', 'hosp-4', 'Children & Family Care Center', 14, 900.0, '+91 98765 11009', 'sophia.p@carepulse.com', 'Cabin 108 - 1st Floor', FALSE, 'https://images.unsplash.com/photo-1594824813566-78a99478f237?w=400&auto=format&fit=crop&q=80', 4.9, 210, 'Senior Pediatrician dedicated to neonatal care, child development, and vaccinations.'),
    ('doc-4', 'Dr. Ethan Reynolds', 'Neurologist', 'Neurology', 'hosp-2', 'Metropolitan General Hospital', 16, 1200.0, '+91 98765 11010', 'ethan.r@carepulse.com', 'Cabin 301 - 3rd Floor', TRUE, 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80', 4.8, 160, 'Specialist in stroke recovery, cognitive disorders, migraines, and neuro-rehabilitation.')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, specialty = EXCLUDED.specialty, hospital_id = EXCLUDED.hospital_id, hospital_name = EXCLUDED.hospital_name, photo = EXCLUDED.photo, rating = EXCLUDED.rating;


-- 4. Appointments Table Migration & Seed
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    ticket_number VARCHAR(50) NOT NULL,
    doctor_id VARCHAR(100) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    doctor_specialty VARCHAR(255) DEFAULT 'General Medicine',
    doctor_photo TEXT DEFAULT '',
    hospital_name VARCHAR(255) DEFAULT 'St. Jude Heart & Medical Center',
    date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    type VARCHAR(50) DEFAULT 'In-Person',
    status VARCHAR(50) DEFAULT 'Upcoming',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO appointments (patient_id, ticket_number, doctor_id, doctor_name, doctor_specialty, doctor_photo, hospital_name, date, time_slot, type, status)
VALUES
    ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '#CP-4821', 'doc-1', 'Dr. Olivia Wilson', 'Cardiologist', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80', 'St. Jude Heart & Medical Center', CURRENT_DATE + INTERVAL '1 day', '10:00 AM - 11:00 AM', 'In-Person', 'Upcoming'),
    ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', '#CP-4822', 'doc-1', 'Dr. Olivia Wilson', 'Cardiologist', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80', 'St. Jude Heart & Medical Center', CURRENT_DATE, '10:00 AM - 11:00 AM', 'In-Person', 'Upcoming'),
    ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', '#CP-4823', 'doc-2', 'Dr. Marcus Vance', 'Dermatologist', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80', 'Cedar Skin & Wellness Clinic', CURRENT_DATE + INTERVAL '2 day', '11:00 AM - 12:00 PM', 'In-Person', 'Upcoming'),
    ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', '#CP-4824', 'doc-4', 'Dr. Ethan Reynolds', 'Neurologist', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80', 'Metropolitan General Hospital', CURRENT_DATE + INTERVAL '3 day', '02:00 PM - 03:00 PM', 'In-Person', 'Upcoming')
ON CONFLICT DO NOTHING;


-- 5. Consultations Table Migration & Seed
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id VARCHAR(100) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    soap_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    soap_embedding vector(1536), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO consultations (patient_id, doctor_id, doctor_name, date, soap_data)
VALUES
    (
        'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        'doc-1',
        'Dr. Olivia Wilson',
        CURRENT_DATE - INTERVAL '14 days',
        '{
            "subjective": "Patient reports mild seasonal allergy symptoms including sneezing, nasal congestion, and mild itchy eyes.",
            "objective": "Clear nasal discharge, no wheezing, regular heart sounds, blood pressure normal at 118/76 mmHg.",
            "assessment": "Allergic Rhinitis.",
            "plan": "Prescribed Cetirizine 10mg once daily at bedtime. Advised avoidance of outdoor pollen triggers.",
            "vitals": {"bp": "118/76", "heart_rate": 72, "temperature": 98.4, "spo2": 99}
        }'::jsonb
    ),
    (
        'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
        'doc-2',
        'Dr. Marcus Vance',
        CURRENT_DATE - INTERVAL '7 days',
        '{
            "subjective": "Patient notes dry, itchy red patches on both inner elbows exacerbated by humid weather.",
            "objective": "Erythematous scaly plaques present on bilateral antecubital fossae without secondary infection.",
            "assessment": "Mild Atopic Dermatitis (Eczema).",
            "plan": "Hydrocortisone 1% cream apply twice daily for 5 days. Emollient moisturizing lotion after bathing.",
            "vitals": {"bp": "122/80", "heart_rate": 76, "temperature": 98.6, "spo2": 98}
        }'::jsonb
    )
ON CONFLICT DO NOTHING;
