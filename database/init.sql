-- CarePulse Database Schema & Migrations (PostgreSQL + pgvector)

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_code VARCHAR(20) UNIQUE,
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
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_code VARCHAR(20) UNIQUE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pre_existing_conditions TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb;
ALTER TABLE patients ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE patients ALTER COLUMN dob DROP NOT NULL;

-- Sequences for Auto-Numbering Display Codes
CREATE SEQUENCE IF NOT EXISTS patient_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS admin_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS receptionist_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS doctor_code_seq START 1;

-- Trigger Function for Auto-Generating Patient Display Codes (PAT-000042)
CREATE OR REPLACE FUNCTION generate_patient_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.patient_code IS NULL OR NEW.patient_code = '' THEN
        NEW.patient_code := 'PAT-' || LPAD(nextval('patient_code_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_patient_code ON patients;
CREATE TRIGGER trigger_generate_patient_code
BEFORE INSERT ON patients
FOR EACH ROW
EXECUTE FUNCTION generate_patient_code();

-- Hospitals Table
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

-- Doctors Table
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

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    ticket_number VARCHAR(50) NOT NULL,
    doctor_id VARCHAR(100) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    doctor_specialty VARCHAR(255) DEFAULT 'General Medicine',
    doctor_photo TEXT DEFAULT '',
    hospital_id VARCHAR(100) REFERENCES hospitals(id),
    hospital_name VARCHAR(255) DEFAULT 'CarePulse Central Hospital',
    date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    type VARCHAR(50) DEFAULT 'In-Person',
    status VARCHAR(50) DEFAULT 'Upcoming',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(100) REFERENCES hospitals(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(255) DEFAULT 'CarePulse Central Hospital';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_specialty VARCHAR(255) DEFAULT 'General Medicine';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_photo TEXT DEFAULT '';

-- Indexes for appointments
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (date);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_id ON appointments (hospital_id);

-- Consultations Table with JSONB
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id VARCHAR(100) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    hospital_id VARCHAR(100) REFERENCES hospitals(id),
    date DATE NOT NULL,
    soap_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE consultations ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(100) REFERENCES hospitals(id);
CREATE INDEX IF NOT EXISTS idx_consultations_soap_data ON consultations USING gin (soap_data);
CREATE INDEX IF NOT EXISTS idx_consultations_hospital_id ON consultations (hospital_id);

-- Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_code VARCHAR(20) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    auth_provider VARCHAR(50) DEFAULT 'local',
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'receptionist', 'doctor')),
    specialization VARCHAR(255),
    phone VARCHAR(50) DEFAULT '',
    avatar_url TEXT DEFAULT '',
    hospital_id VARCHAR(100) REFERENCES hospitals(id) ON DELETE SET NULL,
    doctor_id VARCHAR(100) REFERENCES doctors(id) ON DELETE SET NULL,
    created_by UUID REFERENCES staff(id),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_code VARCHAR(20) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);

-- Trigger Function for Auto-Generating Staff Display Codes (ADM-0001, REC-0001, DOC-0001)
CREATE OR REPLACE FUNCTION generate_staff_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.staff_code IS NULL OR NEW.staff_code = '' THEN
        IF NEW.role = 'admin' THEN
            NEW.staff_code := 'ADM-' || LPAD(nextval('admin_code_seq')::text, 4, '0');
        ELSIF NEW.role = 'receptionist' THEN
            NEW.staff_code := 'REC-' || LPAD(nextval('receptionist_code_seq')::text, 4, '0');
        ELSIF NEW.role = 'doctor' THEN
            NEW.staff_code := 'DOC-' || LPAD(nextval('doctor_code_seq')::text, 4, '0');
        ELSE
            NEW.staff_code := 'STF-' || LPAD(nextval('admin_code_seq')::text, 4, '0');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_staff_code ON staff;
CREATE TRIGGER trigger_generate_staff_code
BEFORE INSERT ON staff
FOR EACH ROW
EXECUTE FUNCTION generate_staff_code();

-- Emergency Contacts Table
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    relationship VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    drug_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    prescriber VARCHAR(255),
    icon_type VARCHAR(20) DEFAULT 'pill',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);

-- Receptionist Desks Table
CREATE TABLE IF NOT EXISTS receptionist_desks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id VARCHAR(100) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    desk_number VARCHAR(50) NOT NULL,
    assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_desks_hospital_desknum ON receptionist_desks(hospital_id, desk_number);

-- Operations Log Table
CREATE TABLE IF NOT EXISTS operations_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    staff_name VARCHAR(255),
    operation VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_operations_log_created_at ON operations_log(created_at DESC);

-- Insert Mock Data
INSERT INTO hospitals (id, name, address, phone, rating, reviews_count, emergency_available, image_url, specialties, facility_type, distance_miles)
VALUES
    ('hosp-1', 'St. Jude Heart & Medical Center', '742 Evergreen Terrace, Downtown', '+91 80 2345 6789', 4.9, 2420, TRUE, 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80', '["Cardiology", "General Medicine", "Surgery", "Pediatrics"]'::jsonb, 'Cardiology', 0.8),
    ('hosp-2', 'Metropolitan General Hospital', '1200 Grand Avenue, Midtown', '+91 80 4455 6677', 4.8, 1850, TRUE, 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80', '["General", "Emergency Care", "Orthopedics", "Neurology"]'::jsonb, 'General', 1.4),
    ('hosp-3', 'Cedar Skin & Wellness Clinic', '450 University Blvd, Westside', '+91 80 9988 1122', 4.7, 940, FALSE, 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80', '["Dermatology", "Wellness", "Allergy"]'::jsonb, 'Specialty Clinic', 2.1),
    ('hosp-4', 'Children & Family Care Center', '88 Peak Street, Northside', '+91 80 7766 5544', 4.9, 3100, TRUE, 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80', '["Pediatrics", "Neonatology", "General"]'::jsonb, 'Pediatrics', 3.5)
ON CONFLICT (id) DO NOTHING;

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
ON CONFLICT (id) DO NOTHING;

INSERT INTO patients (id, full_name, email, phone, dob, gender, blood_group, password_hash, auth_provider)
VALUES ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Sarah Jenkins', 'sarah.j@carepulse.com', '+91 98765 43210', '1995-07-24', 'Female', 'O+', '$2b$12$esrWvIV/CIXCyzBPt8quiuvqA5d5twZbBPDh.vZy97GpkTz.OFmQS', 'local')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash WHERE patients.password_hash IS NULL;

INSERT INTO consultations (patient_id, doctor_id, doctor_name, hospital_id, date, soap_data)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'doc-1',
    'Dr. Olivia Wilson',
    'hosp-1',
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

INSERT INTO appointments (patient_id, ticket_number, doctor_id, doctor_name, doctor_specialty, doctor_photo, hospital_id, hospital_name, date, time_slot, type, status)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    '#CP-4821',
    'doc-1',
    'Dr. Olivia Wilson',
    'Cardiologist',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
    'hosp-1',
    'St. Jude Heart & Medical Center',
    CURRENT_DATE + INTERVAL '1 day',
    '10:30 AM',
    'In-Person',
    'Upcoming'
) ON CONFLICT DO NOTHING;

-- Password Reset OTPs Table (Firebase / PostgreSQL Integration)
CREATE TABLE IF NOT EXISTS password_reset_otps (
    id SERIAL PRIMARY KEY,
    firebase_uid TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER DEFAULT 0,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Device Tokens Table for FCM Push Notifications
CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL,
    platform VARCHAR(20) DEFAULT 'android',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_device_tokens_patient_id ON device_tokens(patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_unique ON device_tokens(patient_id, fcm_token);

-- Notification Tracking Log Table
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    reference_id UUID,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notification_log_lookup ON notification_log(patient_id, notification_type, reference_id);

