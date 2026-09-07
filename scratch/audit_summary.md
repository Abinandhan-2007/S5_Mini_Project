# Comprehensive Audit Report: Snake_case & Dual-Checking

## 1. Type & Interface Definitions with Snake_Case / Dual Fields

### `lib\googleAuth.ts`
- **`Window`**: `client_id` (line 13), `auto_select` (line 15), `cancel_on_tap_outside` (line 16), `logo_alignment` (line 27)

### `lib\types.ts`
- **`User`**: `patient_code` (line 3)
- **`Doctor`**: `staff_code` (line 26), `hospital_id` (line 32), `hospital_name` (line 34), `reviews_count` (line 39), `experience_years` (line 41), `consultation_fee` (line 43), `room_number` (line 47), `is_available` (line 50), `available_days` (line 52), `slot_capacities` (line 54)
- **`Hospital`**: `hospital_code` (line 59)
- **`Appointment`**: `hospital_id` (line 81)
- **`DrugInfoData`**: `drug_name` (line 108), `indications_and_usage` (line 111)
- **`MedicineSearchResultItem`**: `generic_name` (line 164), `dosage_form` (line 165), `match_type` (line 169), `similarity_score` (line 170)
- **`MedicineSearchResponse`**: `did_you_mean` (line 176)
- **`MedicalHistoryItem`**: `hospital_id` (line 214)

### `portals\doctor\ActiveConsultation.tsx`
- **`ConsultationTab`**: `has_vitals` (line 96), `abnormal_flags` (line 98), `lab_tests` (line 99)

### `types\nurse.ts`
- **`VitalsRecord`**: `appointment_id` (line 31), `patient_id` (line 32), `height_cm` (line 33), `weight_kg` (line 34), `bp_systolic` (line 36), `bp_diastolic` (line 37), `heart_rate` (line 38), `temperature_unit` (line 40), `respiratory_rate` (line 41), `blood_glucose` (line 43), `glucose_context` (line 44), `abnormal_flags` (line 46), `recorded_by` (line 47), `recorded_by_name` (line 48), `recorded_at` (line 49)
- **`VitalsFormData`**: `appointment_id` (line 53), `patient_id` (line 54), `height_cm` (line 55), `weight_kg` (line 56), `bp_systolic` (line 57), `bp_diastolic` (line 58), `heart_rate` (line 59), `temperature_unit` (line 61), `respiratory_rate` (line 62), `blood_glucose` (line 64), `glucose_context` (line 65)
- **`LabTestRecord`**: `appointment_id` (line 71), `patient_id` (line 72), `test_type` (line 73), `structured_results` (line 74), `free_text_result` (line 75), `file_url` (line 76), `ordered_by` (line 78), `recorded_by` (line 79), `recorded_by_name` (line 80), `recorded_at` (line 81)
- **`LabTestFormData`**: `appointment_id` (line 85), `patient_id` (line 86), `test_type` (line 87), `structured_results` (line 88), `free_text_result` (line 89), `file_url` (line 90)
- **`NurseQueuePatient`**: `blood_group` (line 99), `patient_code` (line 101)
- **`NurseQueueDoctor`**: `room_number` (line 108)
- **`NurseQueueItem`**: `appointment_id` (line 112), `token_number` (line 113), `queue_status` (line 114), `vitals_status` (line 115), `appointment_type` (line 118), `chief_complaint` (line 119), `abnormal_flags` (line 123), `lab_test_count` (line 124)

### `types\receptionist.ts`
- **`DoctorRecord`**: `staff_code` (line 20), `hospital_id` (line 25)
- **`ReceptionistProfile`**: `staff_code` (line 79)

### `types\staff.ts`
- **`Staff`**: `staff_code` (line 7), `hospital_id` (line 16), `doctor_id` (line 19)
- **`AdminProfile`**: `staff_code` (line 25), `hospital_id` (line 37)
- **`ReceptionistRecord`**: `staff_code` (line 42), `hospital_id` (line 52)
- **`NurseRecord`**: `staff_code` (line 64), `hospital_id` (line 73), `created_at` (line 79)
- **`HospitalBranch`**: `hospital_code` (line 99)
- **`SuperAdminStats`**: `total_hospitals` (line 140), `active_hospitals` (line 141), `total_admins` (line 142), `hospitals_with_admin` (line 143), `hospitals_without_admin` (line 144), `total_doctors` (line 145), `total_receptionists` (line 146), `total_patients` (line 147)
- **`SuperAdminHospital`**: `hospital_code` (line 152), `facility_type` (line 157), `reviews_count` (line 159), `emergency_available` (line 160), `image_url` (line 161), `is_active` (line 163), `created_at` (line 164), `has_active_admin` (line 165), `doctor_count` (line 166), `receptionist_count` (line 167), `full_name` (line 170), `staff_code` (line 172), `is_active` (line 174), `created_at` (line 175)
- **`SuperAdminAdmin`**: `staff_code` (line 181), `full_name` (line 182), `is_active` (line 187), `hospital_id` (line 188), `hospital_name` (line 189), `hospital_code` (line 190), `created_at` (line 191)

## 2. Frontend Code Locations with Dual-Checking / Fallback Access

### `components\medicines\MedicineAutocompleteInput.tsx` (8 instances)
- Line 66: `setDidYouMean(data.did_you_mean || null);`
- Line 67: `setIsOpen((data.matches && data.matches.length > 0) || Boolean(data.did_you_mean));`
- Line 293: `item.match_type === 'exact'`
- Line 295: `: item.match_type === 'prefix'`
- Line 300: `{item.match_type === 'exact'`
- Line 302: `: item.match_type === 'prefix'`
- Line 318: `{(item.dosage_form || (item.strengths && item.strengths.length > 0)) && (`
- Line 323: `{item.dosage_form || 'Tablet'}`

### `components\ui\AppLockModal.tsx` (2 instances)
- Line 207: `const localPass = match?.password || match?.password_hash || (user as any)?.password;`
- Line 225: `const localPass = match?.password || match?.password_hash || (user as any)?.password;`

### `components\ui\TimeSlotGrid.tsx` (10 instances)
- Line 151: `if (s.isAvailable === false || s.is_available === false) {`
- Line 152: `allBlocked.push(s.timeSlot || s.time_slot || '');`
- Line 159: `const timeStr = slot.timeSlot || slot.time_slot || slot.time || '';`
- Line 164: `const isExplicitlyDisabled = slot.isAvailable === false || slot.is_available === false;`
- Line 201: `const slots = slotCapacities || (doctor as any)?.slotCapacities || (doctor as any)?.slot_capacities || [];`
- Line 204: `if (s.isAvailable === false || s.is_available === false) {`
- Line 205: `list.push(s.timeSlot || s.time_slot || '');`
- Line 213: `const isDoctorOffDuty = doctor?.isAvailable === false || doctor?.is_available === false;`
- Line 236: `const timeStr = cap.timeSlot || cap.time_slot || '';`
- Line 241: `const isExplicitlyDisabled = cap.isAvailable === false || cap.is_available === false;`

### `features\appointments\BookAppointmentScreen.tsx` (12 instances)
- Line 54: `(d) => d.id === doctorId || d.staffCode === doctorId || d.staff_code === doctorId`
- Line 66: `(d) => d.id === doctorId || d.staffCode === doctorId || d.staff_code === doctorId`
- Line 87: `staffCode: staffDoc.staffCode || staffDoc.staff_code,`
- Line 88: `staff_code: staffDoc.staffCode || staffDoc.staff_code,`
- Line 96: `(d) => d.id === doctorId || d.staffCode === doctorId || d.staff_code === doctorId`
- Line 141: `const caps = (doctor as any)?.slotCapacities || (doctor as any)?.slot_capacities;`
- Line 147: `const caps = (initialDoctor as any)?.slotCapacities || (initialDoctor as any)?.slot_capacities;`
- Line 333: `{doctor.isAvailable === false || doctor.is_available === false ? (`
- Line 349: `{(doctor.staff_code || doctor.staffCode) && (`
- Line 351: `{doctor.staff_code || doctor.staffCode}`
- Line 440: `slotCapacities={(doctor as any)?.slotCapacities || (doctor as any)?.slot_capacities}`
- Line 462: `{doctor.isAvailable === false || doctor.is_available === false ? (`

### `features\hospitals\FindHospitalsScreen.tsx` (2 instances)
- Line 351: `{(hosp.hospital_code || hosp.hospitalCode) && (`
- Line 353: `{hosp.hospital_code || hosp.hospitalCode}`

### `features\hospitals\HospitalDetailScreen.tsx` (6 instances)
- Line 63: `const availableCount = doctors.filter((d) => d.isAvailable !== false && d.is_available !== false).length;`
- Line 81: `const isOffDuty = d.isAvailable === false || d.is_available === false;`
- Line 90: `const isOffDuty = doctor.isAvailable === false || doctor.is_available === false;`
- Line 338: `const isOffDuty = doc.isAvailable === false || doc.is_available === false;`
- Line 370: `{(doc.staff_code || doc.staffCode) && (`
- Line 372: `{doc.staff_code || doc.staffCode}`

### `features\prescriptions\ScanMedicineScreen.tsx` (1 instances)
- Line 276: `const sGen = (item.generic_name || '').toLowerCase();`

### `features\profile\ProfileScreen.tsx` (1 instances)
- Line 270: `user.patient_code ||`

### `lib\apiFetch.ts` (1 instances)
- Line 14: `const ENV_API_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');`

### `lib\googleAuth.ts` (1 instances)
- Line 46: `import.meta.env.VITE_GOOGLE_CLIENT_ID ||`

### `lib\store.ts` (11 instances)
- Line 630: `confidence: aiData.confidence_score ?? 88,`
- Line 631: `riskLevel: aiData.risk_level ?? 'low',`
- Line 632: `specialty: (aiData.suggested_specialties && aiData.suggested_specialties[0]) || 'General Medicine',`
- Line 633: `isEmergency: aiData.is_emergency ?? false,`
- Line 640: `subjective: aiData.soap_note.subjective || msg.text,`
- Line 641: `objective: aiData.soap_note.objective || 'Pending in-person clinical examination.',`
- Line 642: `assessmentDiagnosis: aiData.soap_note.assessment || `${aiData.suggested_specialties?.[0] || 'General Medicine'} Evaluation`,`
- Line 643: `plan: aiData.soap_note.plan || 'Schedule specialist consultation for formal assessment.',`
- Line 644: `confidence: aiData.confidence_score ?? 88,`
- Line 645: `riskLevel: aiData.risk_level ?? 'low',`
- Line 646: `specialty: aiData.suggested_specialties?.[0] || 'General Medicine',`

### `lib\versionChecker.ts` (3 instances)
- Line 115: `const downloadUrl = data.download_url || '';`
- Line 116: `const releaseNotes = data.release_notes || 'Performance improvements and bug fixes.';`
- Line 117: `const releasedAt = data.released_at || '';`

### `portals\admin\AdminDoctorManagement.tsx` (4 instances)
- Line 374: `{(doc.staff_code || doc.staffCode) && (`
- Line 376: `{doc.staff_code || doc.staffCode}`
- Line 514: `{(doc.staff_code || doc.staffCode) && (`
- Line 516: `{doc.staff_code || doc.staffCode}`

### `portals\admin\AdminHospitalManagement.tsx` (2 instances)
- Line 176: `{(hosp.hospital_code || hosp.hospitalCode) && (`
- Line 178: `{hosp.hospital_code || hosp.hospitalCode}`

### `portals\admin\AdminLayout.tsx` (2 instances)
- Line 398: `{currentStaff?.staff_code || currentStaff?.staffCode || 'A001101'}`
- Line 527: `Admin ID: {currentStaff?.staff_code || currentStaff?.staffCode || 'A001101'}`

### `portals\doctor\ActiveConsultation.tsx` (12 instances)
- Line 179: `const apptId = (patient as any).appointmentId || (patient as any).appointment_id || (patient as any).id || patient.id;`
- Line 188: `bpSys: nv.bp_systolic || 120,`
- Line 189: `bpDia: nv.bp_diastolic || 80,`
- Line 190: `heartRate: nv.heart_rate || 74,`
- Line 193: `weight: nv.weight_kg || 68,`
- Line 200: `objective: `Nurse Intake Vitals: BP ${updatedVitals.bpSys}/${updatedVitals.bpDia} mmHg, HR ${updatedVitals.heartRate} bpm, SpO2 ${updatedVitals.spo2}%, Temp ${updatedVitals.temperature}°${nv.temperature_unit || 'C'}, Weight ${updatedVitals.weight} kg, BMI ${nv.bmi || '--'}${nv.blood_glucose ? `, Glucose ${nv.blood_glucose} mg/dL (${nv.glucose_context || ''})` : ''}.${nv.notes ? ` Nurse Notes: ${nv.notes}` : ''}`,`
- Line 389: `<p class="credentials">Cabin 102 · Reg: ${currentStaff?.staff_code || 'MCI-84920'}</p>`
- Line 544: `doctorId: currentStaff?.doctorId || currentStaff?.doctor_id || currentStaff?.id || 'doc-current',`
- Line 779: `{nursePrep && (nursePrep.has_vitals || (nursePrep.lab_tests && nursePrep.lab_tests.length > 0)) && (`
- Line 827: `{nursePrep.vitals.blood_glucose} mg/dL ({nursePrep.vitals.glucose_context || 'random'})`
- Line 863: `<span className="text-[10px] text-slate-500">{lt.free_text_result || 'Completed'}</span>`
- Line 1427: `Cabin 102 · Reg: {currentStaff?.staff_code || 'MCI-84920'}`

### `portals\doctor\DoctorDashboard.tsx` (1 instances)
- Line 40: `const activeDocId = currentStaff?.doctorId || currentStaff?.doctor_id || currentStaff?.id;`

### `portals\doctor\DoctorLayout.tsx` (1 instances)
- Line 86: `const activeDoctorId = currentStaff?.doctorId || currentStaff?.doctor_id || currentStaff?.id;`

### `portals\doctor\DoctorProfile.tsx` (2 instances)
- Line 34: `const activeDocId = currentStaff?.doctorId || currentStaff?.doctor_id || currentStaff?.id;`
- Line 181: `{currentStaff?.staff_code || 'D001101'}`

### `portals\nurse\NurseLayout.tsx` (2 instances)
- Line 50: `<span>{currentStaff?.hospital_id === 'hosp-bag' ? 'BAG Hospital' : 'St. Jude Heart & Medical Center'}</span>`
- Line 53: `{currentStaff?.staff_code || currentStaff?.staffCode || 'N007101'}`

### `portals\nurse\NurseLogin.tsx` (3 instances)
- Line 41: `const hospId = data.staff.hospitalId || data.staff.hospital_id || 'hosp-bag';`
- Line 52: `staff_code: data.staff.staff_code || data.staff.staffCode || 'N007101',`
- Line 53: `staffCode: data.staff.staffCode || data.staff.staff_code || 'N007101',`

### `portals\nurse\NurseQueueDashboard.tsx` (15 instances)
- Line 36: `const hospId = currentStaff?.hospital_id || currentStaff?.hospitalId;`
- Line 60: `(item.patient.patient_code && item.patient.patient_code.toLowerCase().includes(q)) ||`
- Line 61: `String(item.token_number || '').includes(q) ||`
- Line 66: `const matchesStatus = statusFilter === 'all' || item.vitals_status === statusFilter;`
- Line 73: `const pendingCount = queue.filter((i) => i.vitals_status === 'pending').length;`
- Line 74: `const recordedCount = queue.filter((i) => i.vitals_status === 'recorded').length;`
- Line 75: `const flaggedCount = queue.filter((i) => i.vitals_status === 'abnormal_flagged').length;`
- Line 228: `const hasVitals = item.vitals_status !== 'pending';`
- Line 229: `const isFlagged = item.vitals_status === 'abnormal_flagged';`
- Line 256: `<span className="text-base font-black leading-none">{item.token_number || '--'}</span>`
- Line 264: `{item.patient.patient_code || 'PT-REG'}`
- Line 285: `<span>Blood Group: <strong className="text-slate-700">{item.patient.blood_group || 'O+'}</strong></span>`
- Line 312: `{item.lab_test_count !== undefined && item.lab_test_count > 0 && (`
- Line 356: `Temp: <strong>{item.vitals.temperature}°{item.vitals.temperature_unit || 'C'}</strong>`
- Line 366: `Glucose: <strong>{item.vitals.blood_glucose}</strong> mg/dL ({item.vitals.glucose_context || 'random'})`

### `portals\nurse\VitalsEntryModal.tsx` (5 instances)
- Line 57: `setTemperatureUnit(v.temperature_unit || 'C');`
- Line 61: `setGlucoseContext((v.glucose_context as GlucoseContext) || 'random');`
- Line 182: `Pre-Consultation Clinical Screening &bull; Token #{queueItem.token_number || '--'}`
- Line 199: `{queueItem.patient.patient_code || 'PT-REG'}`
- Line 205: `<span>Blood: <strong className="text-slate-800">{queueItem.patient.blood_group || 'O+'}</strong></span>`

### `portals\receptionist\DoctorManagement.tsx` (2 instances)
- Line 166: `{(doctor.staff_code || doctor.staffCode) && (`
- Line 168: `{doctor.staff_code || doctor.staffCode}`

### `portals\receptionist\NurseManagement.tsx` (5 instances)
- Line 40: `const hospId = currentStaff?.hospital_id || currentStaff?.hospitalId || 'hosp-bag';`
- Line 71: `const hospId = currentStaff?.hospital_id || currentStaff?.hospitalId || 'hosp-bag';`
- Line 88: `onShowToast(`Nurse account created! Staff Code: ${created.staff_code || created.staffCode || 'N-Code'}`);`
- Line 101: `(n.staff_code && n.staff_code.toLowerCase().includes(q)) ||`
- Line 181: `{nurse.staff_code || nurse.staffCode || 'N-Code'}`

### `portals\shared\StaffPortalLogin.tsx` (13 instances)
- Line 58: `const hospId = data.staff.hospitalId || data.staff.hospital_id || 'hosp-bag';`
- Line 69: `doctorId: data.staff.doctorId || data.staff.doctor_id,`
- Line 70: `doctor_id: data.staff.doctor_id || data.staff.doctorId,`
- Line 71: `staff_code: data.staff.staff_code || data.staff.staffCode,`
- Line 72: `staffCode: data.staff.staffCode || data.staff.staff_code,`
- Line 156: `(d.staff_code && d.staff_code.toLowerCase() === cleanId) ||`
- Line 160: `const hospId = matchedDoc.hospital_id || matchedDoc.hospitalId || 'hosp-bag';`
- Line 173: `staff_code: matchedDoc.staff_code || matchedDoc.staffCode,`
- Line 174: `staffCode: matchedDoc.staffCode || matchedDoc.staff_code,`
- Line 187: `(r.staff_code && r.staff_code.toLowerCase() === cleanId) ||`
- Line 191: `const hospId = matchedRec.hospital_id || matchedRec.hospitalId || 'hosp-bag';`
- Line 201: `staff_code: matchedRec.staff_code || matchedRec.staffCode,`
- Line 202: `staffCode: matchedRec.staffCode || matchedRec.staff_code,`

### `portals\superadmin\AdminManagement.tsx` (6 instances)
- Line 137: `const selectedHospitalHasAdmin = selectedHospitalObj?.has_active_admin ?? false;`
- Line 141: `admin.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||`
- Line 142: `admin.staff_code.toLowerCase().includes(searchQuery.toLowerCase()) ||`
- Line 144: `(admin.hospital_name && admin.hospital_name.toLowerCase().includes(searchQuery.toLowerCase())) ||`
- Line 148: `hospitalFilter === 'all' || admin.hospital_id === hospitalFilter;`
- Line 298: `{admin.hospital_name || 'Hospital Facility'}`

### `portals\superadmin\HospitalManagement.tsx` (4 instances)
- Line 140: `h.hospital_code.toLowerCase().includes(searchQuery.toLowerCase()) ||`
- Line 145: `(filterType === 'with_admin' && h.has_active_admin) ||`
- Line 146: `(filterType === 'without_admin' && !h.has_active_admin);`
- Line 261: `<div className="text-xs text-teal-700 font-medium mt-0.5">{hosp.facility_type || 'General Hospital'}</div>`

### `portals\superadmin\SuperAdminDashboard.tsx` (9 instances)
- Line 189: `<div className="text-3xl font-bold text-slate-900">{stats?.total_hospitals || 0}</div>`
- Line 191: `<span className="font-semibold text-emerald-600">{stats?.active_hospitals || 0} Active</span>`
- Line 210: `({stats?.hospitals_with_admin || 0}/{stats?.total_hospitals || 0})`
- Line 229: `{(stats?.total_doctors || 0) + (stats?.total_receptionists || 0)}`
- Line 232: `<span className="font-semibold text-slate-700">{stats?.total_doctors || 0}</span> Doctors,{' '}`
- Line 233: `<span className="font-semibold text-slate-700">{stats?.total_receptionists || 0}</span> Front Desk`
- Line 247: `<div className="text-3xl font-bold text-slate-900">{stats?.total_patients || 0}</div>`
- Line 300: `{hosp.hospital_code || 'H---'}`
- Line 311: `{hosp.admin.full_name?.charAt(0) || 'A'}`

### `portals\superadmin\SuperAdminLayout.tsx` (1 instances)
- Line 143: `{currentStaff.staff_code || 'SA101'}`

### `portals\superadmin\SuperAdminLogin.tsx` (2 instances)
- Line 50: `staff_code: data.staff.staff_code || 'SA101',`
- Line 51: `staffCode: data.staff.staff_code || 'SA101',`

### `services\doctorService.ts` (8 instances)
- Line 29: `(s) => s.id === doc.id || s.staffCode === doc.id || s.staff_code === doc.id`
- Line 53: `staffCode: s.staffCode || s.staff_code,`
- Line 54: `staff_code: s.staffCode || s.staff_code,`
- Line 58: `hospitalId: (s as any).hospitalId || (s as any).hospital_id || '',`
- Line 59: `hospitalName: (s as any).hospitalName || (s as any).hospital_name || '',`
- Line 100: `(d) => d.id === id || d.staffCode === id || d.staff_code === id`
- Line 128: `staffCode: staffDoc.staffCode || staffDoc.staff_code,`
- Line 129: `staff_code: staffDoc.staffCode || staffDoc.staff_code,`

### `services\receptionistService.ts` (1 instances)
- Line 17: `photo: d.photo || d.photoUrl || d.photo_url || '/doctor_default.jpg',`

### `store\staffStore.ts` (7 instances)
- Line 237: `const hospId = staff.hospitalId || staff.hospital_id || 'hosp-bag';`
- Line 250: `employeeId: staff.staff_code || staff.staffCode || staff.id,`
- Line 292: `const hospId = get().currentStaff?.hospitalId || get().currentStaff?.hospital_id || 'hosp-bag';`
- Line 393: `const hospId = get().currentStaff?.hospitalId || get().currentStaff?.hospital_id || 'hosp-bag';`
- Line 414: `const hospId = get().currentStaff?.hospitalId || get().currentStaff?.hospital_id || 'hosp-bag';`
- Line 533: `const hospId = get().currentStaff?.hospitalId || get().currentStaff?.hospital_id || 'hosp-bag';`
- Line 547: `const hospId = get().currentStaff?.hospitalId || get().currentStaff?.hospital_id || 'hosp-bag';`

