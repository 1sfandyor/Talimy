#!/bin/bash

SCHEMA_VERSION="d6dcfctsapqs7390lsv0"
TENANT_ID="t1"

curl -sS -X POST "http://10.66.66.1:3476/v1/tenants/t1/relationships/write" \
    -H "Content-Type: application/json" \
    -d @- <<JSON
  {
    "metadata": {
      "schema_version": "$SCHEMA_VERSION"
    },
    "tuples": [
      { "entity": { "type": "student_gender_policy", "id": "${TENANT_ID}:student" }, "relation": "school_admin_boys",  "subject": { "type": "user", "id":
  "u_boys_admin",  "relation": "" } },
      { "entity": { "type": "student_gender_policy", "id": "${TENANT_ID}:student:male" }, "relation": "school_admin_boys",  "subject": { "type": "user",
  "id": "u_boys_admin",  "relation": "" } },

      { "entity": { "type": "student_gender_policy", "id": "${TENANT_ID}:student" }, "relation": "school_admin_girls", "subject": { "type": "user", "id":
  "u_girls_admin", "relation": "" } },
      { "entity": { "type": "student_gender_policy", "id": "${TENANT_ID}:student:female" }, "relation": "school_admin_girls", "subject": { "type": "user",
  "id": "u_girls_admin", "relation": "" } },

      { "entity": { "type": "student_gender_policy", "id": "${TENANT_ID}:student" }, "relation": "school_admin_all", "subject": { "type": "user", "id":
  "u_all_admin", "relation": "" } },
      { "entity": { "type": "student_gender_policy", "id": "${TENANT_ID}:student:male" }, "relation": "school_admin_all", "subject": { "type": "user", "id":
  "u_all_admin", "relation": "" } },
      { "entity": { "type": "student_gender_policy", "id": "${TENANT_ID}:student:female" }, "relation": "school_admin_all", "subject": { "type": "user",
  "id": "u_all_admin", "relation": "" } },

      { "entity": { "type": "student_gender_policy", "id": "${TENANT_ID}:student" }, "relation": "principal", "subject": { "type": "user", "id":
  "u_principal", "relation": "" } },
      { "entity": { "type": "student_gender_policy", "id": "${TENANT_ID}:student:male" }, "relation": "principal", "subject": { "type": "user", "id":
  "u_principal", "relation": "" } },
      { "entity": { "type": "student_gender_policy", "id": "${TENANT_ID}:student:female" }, "relation": "principal", "subject": { "type": "user", "id":
  "u_principal", "relation": "" } },

      { "entity": { "type": "teacher_gender_policy", "id": "${TENANT_ID}:teacher" }, "relation": "school_admin_boys",  "subject": { "type": "user", "id":
  "u_boys_admin",  "relation": "" } },
      { "entity": { "type": "teacher_gender_policy", "id": "${TENANT_ID}:teacher:male" }, "relation": "school_admin_boys",  "subject": { "type": "user",
  "id": "u_boys_admin",  "relation": "" } },

      { "entity": { "type": "teacher_gender_policy", "id": "${TENANT_ID}:teacher" }, "relation": "school_admin_girls", "subject": { "type": "user", "id":
  "u_girls_admin", "relation": "" } },
      { "entity": { "type": "teacher_gender_policy", "id": "${TENANT_ID}:teacher:female" }, "relation": "school_admin_girls", "subject": { "type": "user",
  "id": "u_girls_admin", "relation": "" } },

      { "entity": { "type": "teacher_gender_policy", "id": "${TENANT_ID}:teacher" }, "relation": "school_admin_all", "subject": { "type": "user", "id":
  "u_all_admin", "relation": "" } },
      { "entity": { "type": "teacher_gender_policy", "id": "${TENANT_ID}:teacher:male" }, "relation": "school_admin_all", "subject": { "type": "user", "id":
  "u_all_admin", "relation": "" } },
      { "entity": { "type": "teacher_gender_policy", "id": "${TENANT_ID}:teacher:female" }, "relation": "school_admin_all", "subject": { "type": "user",
  "id": "u_all_admin", "relation": "" } },

      { "entity": { "type": "teacher_gender_policy", "id": "${TENANT_ID}:teacher" }, "relation": "principal", "subject": { "type": "user", "id":
  "u_principal", "relation": "" } },
      { "entity": { "type": "teacher_gender_policy", "id": "${TENANT_ID}:teacher:male" }, "relation": "principal", "subject": { "type": "user", "id":
  "u_principal", "relation": "" } },
      { "entity": { "type": "teacher_gender_policy", "id": "${TENANT_ID}:teacher:female" }, "relation": "principal", "subject": { "type": "user", "id":
  "u_principal", "relation": "" } }
    ]
  }
JSON
