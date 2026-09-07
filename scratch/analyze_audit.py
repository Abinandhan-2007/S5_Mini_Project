import json

with open('scratch/audit_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

interfaces = data['interfaces']
by_file_if = {}
for item in interfaces:
    key = f"{item['file']} -> {item['interface']}"
    by_file_if.setdefault(key, []).append((item['line'], item['field']))

print("=== INTERFACES WITH SNAKE_CASE FIELDS ===")
for k, fields in sorted(by_file_if.items()):
    field_str = ", ".join([f"{f} (L{l})" for l, f in fields])
    print(f"{k} [{len(fields)} fields]:\n   {field_str}\n")

print("\n=== DUAL CHECKS (SAMPLE & GROUPED BY TYPE) ===")
dual_checks = data['dual_checks']

# Categorize dual checks by pattern
hospital_id_checks = []
staff_code_checks = []
doctor_id_checks = []
patient_id_code_checks = []
is_available_checks = []
slot_capacities_checks = []
other_checks = []

for c in dual_checks:
    code = c['code']
    f_l = f"{c['file']}:{c['line']}"
    if 'hospital_id' in code or 'hospitalId' in code:
        hospital_id_checks.append((f_l, code))
    elif 'staff_code' in code or 'staffCode' in code:
        staff_code_checks.append((f_l, code))
    elif 'doctor_id' in code or 'doctorId' in code:
        doctor_id_checks.append((f_l, code))
    elif 'patient_id' in code or 'patientId' in code or 'patient_code' in code or 'patientCode' in code:
        patient_id_code_checks.append((f_l, code))
    elif 'is_available' in code or 'isAvailable' in code:
        is_available_checks.append((f_l, code))
    elif 'slot_capacities' in code or 'slotCapacities' in code:
        slot_capacities_checks.append((f_l, code))
    else:
        other_checks.append((f_l, code))

print(f"Hospital ID checks: {len(hospital_id_checks)}")
print(f"Staff Code checks: {len(staff_code_checks)}")
print(f"Doctor ID checks: {len(doctor_id_checks)}")
print(f"Patient ID/Code checks: {len(patient_id_code_checks)}")
print(f"Is Available checks: {len(is_available_checks)}")
print(f"Slot Capacities checks: {len(slot_capacities_checks)}")
print(f"Other checks: {len(other_checks)}")
