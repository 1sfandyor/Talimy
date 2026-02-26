import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { Injectable, InternalServerErrorException } from "@nestjs/common"

import type { EmailTemplateName, EmailTemplateRenderResult } from "./email.types"

type TemplateVariables = Record<string, string | number | boolean | null>

@Injectable()
export class EmailTemplatesService {
  private readonly templatesDir = this.resolveTemplatesDir()
  private readonly cache = new Map<string, string>()

  render(
    template: EmailTemplateName,
    variables: TemplateVariables,
    subjectOverride?: string
  ): EmailTemplateRenderResult {
    const htmlTemplate = this.loadTemplate(`${template}.hbs`)
    const textTemplate = this.loadTemplate(`${template}.txt.hbs`)
    const renderedHtml = this.interpolate(htmlTemplate, variables)
    const renderedText = this.interpolate(textTemplate, variables)
    const defaultSubject = this.defaultSubject(template, variables)

    return {
      subject: (subjectOverride?.trim() || defaultSubject).slice(0, 255),
      html: renderedHtml,
      text: renderedText,
    }
  }

  private loadTemplate(fileName: string): string {
    if (this.cache.has(fileName)) {
      return this.cache.get(fileName) ?? ""
    }

    try {
      const content = readFileSync(join(this.templatesDir, fileName), "utf8")
      this.cache.set(fileName, content)
      return content
    } catch (error) {
      throw new InternalServerErrorException(
        `Email template load failed (${fileName}): ${error instanceof Error ? error.message : "unknown error"}`
      )
    }
  }

  private resolveTemplatesDir(): string {
    const cwd = process.cwd()
    const candidates = [
      join(cwd, "src", "modules", "email", "templates"),
      join(cwd, "apps", "api", "src", "modules", "email", "templates"),
      join(cwd, "dist", "modules", "email", "templates"),
      join(cwd, "apps", "api", "dist", "modules", "email", "templates"),
    ]

    const hit = candidates.find((dir) => existsSync(dir))
    return hit ?? candidates[0]!
  }

  private interpolate(template: string, variables: TemplateVariables): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
      const value = variables[key]
      if (value === null || value === undefined) return ""
      return String(value)
    })
  }

  private defaultSubject(template: EmailTemplateName, variables: TemplateVariables): string {
    switch (template) {
      case "welcome":
        return `Xush kelibsiz, ${String(variables.firstName ?? "foydalanuvchi")}`
      case "password-reset":
        return "Parolni tiklash"
      case "invoice":
        return `Invoice #${String(variables.invoiceNumber ?? "N/A")}`
      case "notification":
      default:
        return String(variables.title ?? "Talimy bildirishnoma")
    }
  }
}
