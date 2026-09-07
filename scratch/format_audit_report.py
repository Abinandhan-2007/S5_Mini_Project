import json

with open('scratch/audit_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

interfaces = data['interfaces']
dual_checks = data['dual_checks']

# Group interfaces by file
interfaces_by_file = {}
for item in interfaces:
    interfaces_by_file.setdefault(item['file'], []).append(item)

# Group dual checks by file
checks_by_file = {}
for item in dual_checks:
    checks_by_file.setdefault(item['file'], []).append(item)

with open('scratch/audit_summary.md', 'w', encoding='utf-8') as out:
    out.write("# Comprehensive Audit Report: Snake_case & Dual-Checking\n\n")
    
    out.write("## 1. Type & Interface Definitions with Snake_Case / Dual Fields\n\n")
    for file, items in sorted(interfaces_by_file.items()):
        out.write(f"### `{file}`\n")
        # Group by interface
        by_if = {}
        for it in items:
            by_if.setdefault(it['interface'], []).append(it)
        for if_name, fields in by_if.items():
            field_list = ", ".join([f"`{f['field']}` (line {f['line']})" for f in fields])
            out.write(f"- **`{if_name}`**: {field_list}\n")
        out.write("\n")

    out.write("## 2. Frontend Code Locations with Dual-Checking / Fallback Access\n\n")
    for file, items in sorted(checks_by_file.items()):
        out.write(f"### `{file}` ({len(items)} instances)\n")
        for it in items:
            out.write(f"- Line {it['line']}: `{it['code']}`\n")
        out.write("\n")

print("Audit summary written to scratch/audit_summary.md successfully!")
