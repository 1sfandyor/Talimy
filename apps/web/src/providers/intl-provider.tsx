"use client"

import { NextIntlClientProvider } from "next-intl"
import type { AbstractIntlMessages } from "next-intl"
import type { ReactNode } from "react"

type IntlProviderProps = {
  children: ReactNode
  locale: string
  messages: AbstractIntlMessages
}

export function IntlProvider({ children, locale, messages }: IntlProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="Asia/Tashkent"
      onError={(error) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[i18n]", error)
        }
      }}
    >
      {children}
    </NextIntlClientProvider>
  )
}
