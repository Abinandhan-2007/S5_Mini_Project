import json

with open('scratch/audit_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

keywords = [
    'hospitalId', 'hospital_id',
    'staffCode', 'staff_code',
    'doctorId', 'doctor_id',
    'patientId', 'patient_id',
    'patientCode', 'patient_code',
    'hospitalCode', 'hospital_code',
    'hospitalName', 'hospital_name',
    'isAvailable', 'is_available',
    'isActive', 'is_active',
    'slotCapacities', 'slot_capacities',
    'photoUrl', 'photo_url', 'photo',
    'avatarUrl', 'avatar_url',
    'reviewsCount', 'reviews_count',
    'experienceYears', 'experience_years',
    'roomNumber', 'room_number',
    'fullName', 'full_name'
]

print("=== EXACT DUAL-CHECKING OCCURRENCES IN FRONTEND ===")
count = 0
for c in data['dual_checks']:
    code = c['code']
    # If the line contains both camelCase and snake_case variants or fallback checks
    has_dual = False
    for i in range(0, len(keywords), 2):
        k1 = keywords[i]
        k2 = keywords[i+1] if i+1 < len(keywords) else ''
        if (k1 in code and k2 in code) or (k1 in code and '||' in code and '_' in code) or (k2 in code and '||' in code):
            has_dual = True
            break
    if has_dual:
        count += 1
        print(f"{c['file']}:{c['line']} -> {code}")

print(f"\nTotal exact dual checks found: {count}")
