#!/usr/bin/env node

/* eslint-disable no-console */

const permify = require("@permify/permify-node")

const DEFAULT_SCHEMA = `
entity user {}

entity teacher_gender_policy {
  permission gender_list = ("platform_admin" in context.data.roles) or ("school_admin" in context.data.roles)
  permission gender_create = ("platform_admin" in context.data.roles) or (("school_admin" in context.data.roles) and ((context.data.userGenderScope == "all") or ((context.data.targetGender != null) and (context.data.userGenderScope == context.data.targetGender))))
  permission gender_update = ("platform_admin" in context.data.roles) or (("school_admin" in context.data.roles) and ((context.data.userGenderScope == "all") or ((context.data.targetGender != null) and (context.data.userGenderScope == context.data.targetGender))))
}

entity student_gender_policy {
  permission gender_list = ("platform_admin" in context.data.roles) or ("school_admin" in context.data.roles)
  permission gender_create = ("platform_admin" in context.data.roles) or (("school_admin" in context.data.roles) and ((context.data.userGenderScope == "all") or ((context.data.targetGender != null) and (context.data.userGenderScope == context.data.targetGender))))
  permission gender_update = ("platform_admin" in context.data.roles) or (("school_admin" in context.data.roles) and ((context.data.userGenderScope == "all") or ((context.data.targetGender != null) and (context.data.userGenderScope == context.data.targetGender))))
}
`.trim()

function getArg(name, fallback = "") {
  const prefix = `--${name}=`
  const hit = process.argv.find((arg) => arg.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : fallback
}

function usage() {
  console.log(
    [
      "Usage:",
      "  node apps/api/scripts/permify-publish-gender-schema.js --endpoint=10.66.66.1:3478 --tenant-id=<uuid> [--tenant-name=Mezana]",
      "",
      "Env fallback:",
      "  PERMIFY_GRPC_ENDPOINT, PERMIFY_INSECURE, PERMIFY_TIMEOUT_MS",
    ].join("\n")
  )
}

async function main() {
  const endpoint = getArg("endpoint", process.env.PERMIFY_GRPC_ENDPOINT || "")
  const tenantId = getArg("tenant-id", process.env.PERMIFY_TENANT_ID || "")
  const tenantName = getArg("tenant-name", process.env.PERMIFY_TENANT_NAME || "Talimy Tenant")
  const timeout = Number(getArg("timeout", process.env.PERMIFY_TIMEOUT_MS || "8000"))
  const insecureEnv = (getArg("insecure", process.env.PERMIFY_INSECURE || "true") || "true")
    .trim()
    .toLowerCase()
  const insecure = insecureEnv === "true"

  if (!endpoint || !tenantId) {
    usage()
    process.exit(1)
  }

  const client = permify.grpc.newClient({
    endpoint,
    insecure,
    timeout,
    cert: null,
    pk: null,
    certChain: null,
  })

  console.log(
    `[permify] endpoint=${endpoint} tenant=${tenantId} insecure=${insecure} timeout=${timeout}`
  )

  try {
    try {
      const tenancyRes = await client.tenancy.create({ id: tenantId, name: tenantName })
      console.log("[permify] tenancy.create ok", JSON.stringify(tenancyRes))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log("[permify] tenancy.create skipped/error", message)
    }

    const writeRes = await client.schema.write({
      tenantId,
      schema: DEFAULT_SCHEMA,
    })
    console.log("[permify] schema.write ok", JSON.stringify(writeRes))

    const schemaVersion =
      writeRes?.schemaVersion || writeRes?.schema_version || writeRes?.metadata?.schemaVersion || ""

    console.log(`[permify] schemaVersion=${schemaVersion || "<empty>"}`)

    const probeRes = await client.permission.check({
      tenantId,
      metadata: {
        snapToken: "",
        schemaVersion: schemaVersion || "",
        depth: 20,
      },
      entity: {
        type: "teacher_gender_policy",
        id: `${tenantId}:teacher`,
      },
      permission: "gender_list",
      subject: {
        type: "user",
        id: "smoke-probe",
        relation: "",
      },
      context: {
        tuples: [],
        attributes: [],
        data: {
          roles: ["school_admin"],
          userGenderScope: "all",
          targetGender: null,
          entity: "teacher",
          action: "list",
        },
      },
      arguments: [],
    })

    console.log("[permify] permission.check probe", JSON.stringify(probeRes))
    console.log("[permify] done")
  } catch (error) {
    console.error("[permify] fatal", error)
    process.exit(1)
  }
}

void main()
