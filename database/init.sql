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
CREATE SEQUENCE IF NOT EXISTS hospital_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS admin_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS receptionist_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS doctor_code_seq START 1;

-- Trigger Function for Auto-Generating Patient Display Codes (P000001, P000042)
CREATE OR REPLACE FUNCTION generate_patient_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.patient_code IS NULL OR NEW.patient_code = '' THEN
        NEW.patient_code := 'P' || LPAD(nextval('patient_code_seq')::text, 6, '0');
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
    hospital_code VARCHAR(20) UNIQUE,
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

ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS hospital_code VARCHAR(20) UNIQUE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 1) DEFAULT 4.8;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS reviews_count INT DEFAULT 1500;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS emergency_available BOOLEAN DEFAULT TRUE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS specialties JSONB DEFAULT '["General", "Emergency Care"]'::jsonb;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS facility_type VARCHAR(100) DEFAULT 'General';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS distance_miles DECIMAL(4, 1) DEFAULT 1.0;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Trigger Function for Auto-Generating Hospital Display Codes (H001, H002, H003...)
CREATE OR REPLACE FUNCTION generate_hospital_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.hospital_code IS NULL OR NEW.hospital_code = '' THEN
        NEW.hospital_code := 'H' || LPAD(nextval('hospital_code_seq')::text, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_hospital_code ON hospitals;
CREATE TRIGGER trigger_generate_hospital_code
BEFORE INSERT ON hospitals
FOR EACH ROW
EXECUTE FUNCTION generate_hospital_code();

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
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS availability_reason VARCHAR(255) DEFAULT '';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS unavailable_until VARCHAR(100) DEFAULT '';
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
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_checked_in BOOLEAN DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS check_in_time VARCHAR(50);

-- Indexes for appointments
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (date);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_id ON appointments (hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_is_checked_in ON appointments (is_checked_in);

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
    role VARCHAR(50) NOT NULL CHECK (role IN ('superadmin', 'admin', 'receptionist', 'doctor', 'nurse')),
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
ALTER TABLE staff ADD COLUMN IF NOT EXISTS username VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);

-- Business Rule: Exactly ONE active administrator per hospital
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_admin_per_hospital ON staff (hospital_id) WHERE role = 'admin' AND is_active = true;

-- Trigger Function for Auto-Generating Hierarchical Staff Display Codes (<RoleLetter><HospitalNumber><Seq101+>, e.g. A001101, D001101, R001101, N001101)
CREATE OR REPLACE FUNCTION generate_staff_code()
RETURNS TRIGGER AS $$
DECLARE
    h_code VARCHAR(20);
    h_num VARCHAR(10);
    role_letter CHAR(1);
    staff_count INT;
    seq_num INT;
BEGIN
    IF NEW.staff_code IS NULL OR NEW.staff_code = '' THEN
        -- Special handling for SuperAdmin: Global scope, format SA101, SA102...
        IF NEW.role = 'superadmin' THEN
            SELECT COUNT(*) INTO staff_count 
            FROM staff 
            WHERE role = 'superadmin' 
              AND (NEW.id IS NULL OR id <> NEW.id);
            seq_num := 101 + staff_count;
            NEW.staff_code := 'SA' || LPAD(seq_num::text, 3, '0');
            RETURN NEW;
        END IF;

        -- 1. Explicit Role Letter Mapping (Enforces 'N' strictly for nurse)
        IF NEW.role = 'admin' THEN
            role_letter := 'A';
        ELSIF NEW.role = 'doctor' THEN
            role_letter := 'D';
        ELSIF NEW.role = 'receptionist' THEN
            role_letter := 'R';
        ELSIF NEW.role = 'nurse' THEN
            role_letter := 'N';
        ELSE
            role_letter := 'S';
        END IF;

        -- 2. Lookup Hospital 3-digit number from hospital_code (or hospital_id fallback)
        h_num := '001';
        IF NEW.hospital_id IS NOT NULL THEN
            SELECT hospital_code INTO h_code FROM hospitals WHERE id = NEW.hospital_id;
            IF h_code IS NOT NULL AND h_code <> '' THEN
                h_num := LPAD(REGEXP_REPLACE(h_code, '[^0-9]', '', 'g'), 3, '0');
            ELSE
                h_num := LPAD(REGEXP_REPLACE(NEW.hospital_id, '[^0-9]', '', 'g'), 3, '0');
            END IF;
        END IF;
        IF h_num IS NULL OR h_num = '' THEN
            h_num := '001';
        END IF;

        -- 3. Calculate sequence number within hospital for this role (STARTING AT 101)
        IF NEW.hospital_id IS NOT NULL THEN
            SELECT COUNT(*) INTO staff_count 
            FROM staff 
            WHERE hospital_id = NEW.hospital_id 
              AND role = NEW.role 
              AND (NEW.id IS NULL OR id <> NEW.id);
        ELSE
            SELECT COUNT(*) INTO staff_count 
            FROM staff 
            WHERE hospital_id IS NULL 
              AND role = NEW.role 
              AND (NEW.id IS NULL OR id <> NEW.id);
        END IF;

        seq_num := 101 + staff_count;
        NEW.staff_code := role_letter || h_num || LPAD(seq_num::text, 3, '0');
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
    meal_timing VARCHAR(50) DEFAULT NULL,
    prescriber VARCHAR(255),
    icon_type VARCHAR(20) DEFAULT 'pill',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS meal_timing VARCHAR(50) DEFAULT NULL;
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
    ('hosp-1', 'St. Jude Heart & Medical Center', '742 Evergreen Terrace, Downtown', '+91 80 2345 6789', 4.9, 2420, TRUE, '/hospital_default.jpg', '["Cardiology", "General Medicine", "Surgery", "Pediatrics"]'::jsonb, 'Cardiology', 0.8),
    ('hosp-2', 'Metropolitan General Hospital', '1200 Grand Avenue, Midtown', '+91 80 4455 6677', 4.8, 1850, TRUE, '/hospital_default.jpg', '["General", "Emergency Care", "Orthopedics", "Neurology"]'::jsonb, 'General', 1.4),
    ('hosp-3', 'Cedar Skin & Wellness Clinic', '450 University Blvd, Westside', '+91 80 9988 1122', 4.7, 940, FALSE, '/hospital_default.jpg', '["Dermatology", "Wellness", "Allergy"]'::jsonb, 'Specialty Clinic', 2.1),
    ('hosp-4', 'Children & Family Care Center', '88 Peak Street, Northside', '+91 80 7766 5544', 4.9, 3100, TRUE, '/hospital_default.jpg', '["Pediatrics", "Neonatology", "General"]'::jsonb, 'Pediatrics', 3.5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, name, specialty, department, hospital_id, hospital_name, experience_years, consultation_fee, phone, email, room_number, is_available, photo, rating, reviews_count, about)
VALUES
    ('doc-johan', 'Dr. Johan Janson', 'Endocrinologist', 'Endocrinology', 'hosp-1', 'St. Jude Heart & Medical Center', 8, 850.0, '+91 98765 11001', 'johan.j@carepulse.com', 'Cabin 102 - 1st Floor', TRUE, '/doctor_default.jpg', 4.5, 85, 'Specialist in metabolic health, diabetes management, and endocrine disorders.'),
    ('doc-marilyn', 'Dr. Marilyn Stanton', 'General Physician', 'General Medicine', 'hosp-1', 'St. Jude Heart & Medical Center', 10, 600.0, '+91 98765 11002', 'marilyn.s@carepulse.com', 'Cabin 104 - 1st Floor', TRUE, '/doctor_default.jpg', 5.0, 92, 'Primary care physician focused on preventive health & comprehensive checkups.'),
    ('doc-marvin', 'Dr. Marvin McKinney', 'Cardiologist', 'Cardiology', 'hosp-1', 'St. Jude Heart & Medical Center', 14, 1100.0, '+91 98765 11003', 'marvin.m@carepulse.com', 'Cabin 201 - 2nd Floor', TRUE, '/doctor_default.jpg', 4.3, 110, 'Senior Cardiologist specializing in preventive heart health and electrophysiology.'),
    ('doc-arlene', 'Dr. Arlene McCoy', 'Physician', 'Internal Medicine', 'hosp-1', 'St. Jude Heart & Medical Center', 11, 750.0, '+91 98765 11004', 'arlene.m@carepulse.com', 'Cabin 203 - 2nd Floor', TRUE, '/doctor_default.jpg', 4.5, 78, 'Internal medicine specialist dedicated to holistic patient care.'),
    ('doc-eleanor', 'Dr. Eleanor Pena', 'Arthropathic', 'Orthopedics', 'hosp-1', 'St. Jude Heart & Medical Center', 9, 900.0, '+91 98765 11005', 'eleanor.p@carepulse.com', 'Cabin 302 - 3rd Floor', TRUE, '/doctor_default.jpg', 4.4, 88, 'Specialist in joint health, rheumatoid care, and orthopedic therapy.'),
    ('doc-kaiya', 'Dr. Kaiya Donin', 'Endocrinologist', 'Endocrinology', 'hosp-1', 'St. Jude Heart & Medical Center', 12, 950.0, '+91 98765 11006', 'kaiya.d@carepulse.com', 'Cabin 305 - 3rd Floor', TRUE, '/doctor_default.jpg', 5.0, 105, 'Endocrine care expert specializing in thyroid & metabolic health.'),
    ('doc-1', 'Dr. Olivia Wilson', 'Cardiologist', 'Cardiology', 'hosp-1', 'St. Jude Heart & Medical Center', 12, 850.0, '+91 98765 11007', 'olivia.w@carepulse.com', 'Cabin 101 - 1st Floor', TRUE, '/doctor_default.jpg', 4.9, 142, 'Lead Cardiologist specializing in heart disease prevention and non-invasive cardiac imaging.'),
    ('doc-2', 'Dr. Marcus Vance', 'Dermatologist', 'Dermatology', 'hosp-3', 'Cedar Skin & Wellness Clinic', 9, 700.0, '+91 98765 11008', 'marcus.v@carepulse.com', 'Cabin 204 - 2nd Floor', TRUE, '/doctor_default.jpg', 4.7, 95, 'Board-certified dermatologist with clinical expertise in clinical aesthetics and laser therapy.'),
    ('doc-3', 'Dr. Sophia Patel', 'Pediatrician', 'Pediatrics', 'hosp-4', 'Children & Family Care Center', 14, 900.0, '+91 98765 11009', 'sophia.p@carepulse.com', 'Cabin 108 - 1st Floor', FALSE, '/doctor_default.jpg', 4.9, 210, 'Senior Pediatrician dedicated to neonatal care, child development, and vaccinations.'),
    ('doc-4', 'Dr. Ethan Reynolds', 'Neurologist', 'Neurology', 'hosp-2', 'Metropolitan General Hospital', 16, 1200.0, '+91 98765 11010', 'ethan.r@carepulse.com', 'Cabin 301 - 3rd Floor', TRUE, '/doctor_default.jpg', 4.8, 160, 'Specialist in stroke recovery, cognitive disorders, migraines, and neuro-rehabilitation.')
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

INSERT INTO prescriptions (patient_id, drug_name, dosage, frequency, meal_timing, prescriber, icon_type)
VALUES
    ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Amoxicillin', '500mg', 'Three times daily', 'After Food', 'Dr. Olivia Wilson', 'capsule'),
    ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cetirizine', '10mg', 'Once daily at bedtime', 'After Food', 'Dr. Olivia Wilson', 'pill'),
    ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Paracetamol', '650mg', 'As needed for pain/fever', 'After Food', 'Dr. Marilyn Stanton', 'pill'),
    ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Metformin', '500mg', 'Twice daily', 'With Food', 'Dr. Johan Janson', 'pill')
ON CONFLICT DO NOTHING;

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

-- ===================================================================
-- Friendly Pre-Joined Views (For Easy Database GUI Inspection)
-- ===================================================================

-- 1. v_appointments: Shows patient_code, patient_name, doctor_name, hospital_name
CREATE OR REPLACE VIEW v_appointments AS
SELECT 
    a.id AS appointment_id,
    a.ticket_number,
    p.patient_code,
    p.full_name AS patient_name,
    p.phone AS patient_phone,
    p.email AS patient_email,
    COALESCE(s.staff_code, a.doctor_id) AS doctor_code,
    a.doctor_name,
    a.doctor_specialty,
    h.hospital_code,
    a.hospital_name,
    a.date AS appointment_date,
    a.time_slot,
    a.type,
    a.status,
    a.created_at
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN hospitals h ON a.hospital_id = h.id
LEFT JOIN staff s ON a.doctor_id = s.doctor_id AND s.role = 'doctor';

-- 2. v_consultations: Shows patient_code, patient_name, doctor_name, diagnosis, treatment
CREATE OR REPLACE VIEW v_consultations AS
SELECT 
    c.id AS consultation_id,
    p.patient_code,
    p.full_name AS patient_name,
    p.phone AS patient_phone,
    p.gender AS patient_gender,
    COALESCE(s.staff_code, c.doctor_id) AS doctor_code,
    c.doctor_name,
    h.hospital_code,
    h.name AS hospital_name,
    c.date AS consultation_date,
    c.soap_data->>'subjective' AS subjective_symptoms,
    c.soap_data->>'assessment' AS diagnosis,
    c.soap_data->>'plan' AS treatment_plan,
    c.created_at
FROM consultations c
LEFT JOIN patients p ON c.patient_id = p.id
LEFT JOIN hospitals h ON c.hospital_id = h.id
LEFT JOIN staff s ON c.doctor_id = s.doctor_id AND s.role = 'doctor';

-- 3. v_prescriptions: Shows patient_code, patient_name, drug_name, dosage, meal_timing
CREATE OR REPLACE VIEW v_prescriptions AS
SELECT 
    pr.id AS prescription_id,
    p.patient_code,
    p.full_name AS patient_name,
    pr.drug_name,
    pr.dosage,
    pr.frequency,
    pr.meal_timing,
    pr.prescriber AS doctor_name,
    COALESCE(pr.status, 'Active') AS status,
    pr.created_at
FROM prescriptions pr
LEFT JOIN patients p ON pr.patient_id = p.id;

-- 4. v_staff_directory: Shows staff_code (D001101, R001101, A001101), full_name, role, hospital_code
CREATE OR REPLACE VIEW v_staff_directory AS
SELECT 
    s.id AS staff_id,
    s.staff_code,
    s.full_name,
    s.role,
    s.specialization,
    s.email,
    s.phone,
    h.hospital_code,
    h.name AS hospital_name,
    s.is_active,
    s.created_at
FROM staff s
LEFT JOIN hospitals h ON s.hospital_id = h.id;

-- 5. v_patients: Shows patient_code prominently
CREATE OR REPLACE VIEW v_patients AS
SELECT 
    p.patient_code,
    p.full_name,
    p.email,
    p.phone,
    p.dob,
    p.gender,
    p.blood_group,
    p.id AS patient_uuid,
    p.created_at
FROM patients p;

-- ===================================================================
-- Medicines Catalog Table & pg_trgm GIN Trigram Indexes
-- ===================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS medicines (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) NOT NULL,
    brand_names JSONB DEFAULT '[]'::jsonb,
    dosage_form VARCHAR(50) DEFAULT 'Tablet',
    strengths JSONB DEFAULT '[]'::jsonb,
    category VARCHAR(100) DEFAULT 'General',
    purpose TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_medicines_name_trgm ON medicines USING gin (name gin_trgm_ops);
-- ===================================================================
-- Vitals & Lab Tests Tables (Nurse Pre-Consultation Entry)
-- ===================================================================
CREATE TABLE IF NOT EXISTS vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    bmi NUMERIC GENERATED ALWAYS AS (
        CASE WHEN height_cm > 0 THEN ROUND(weight_kg / ((height_cm/100.0) * (height_cm/100.0)), 1) ELSE NULL END
    ) STORED,
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    heart_rate INTEGER,
    temperature NUMERIC,
    temperature_unit VARCHAR(1) DEFAULT 'C',
    respiratory_rate INTEGER,
    spo2 INTEGER,
    blood_glucose NUMERIC,
    glucose_context VARCHAR(20), -- fasting, random, post-meal
    notes TEXT,
    recorded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vitals_appointment_id ON vitals(appointment_id);
CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON vitals(patient_id);

CREATE TABLE IF NOT EXISTS lab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    test_type VARCHAR(100) NOT NULL,
    structured_results JSONB DEFAULT '{}'::jsonb,
    free_text_result TEXT,
    file_url TEXT,
    status VARCHAR(20) DEFAULT 'ordered', -- ordered, in_progress, completed
    ordered_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    recorded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lab_tests_appointment_id ON lab_tests(appointment_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_patient_id ON lab_tests(patient_id);
