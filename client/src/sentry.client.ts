import { init, browserTracingIntegration } from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN

if (dsn) {
  init({
    dsn,
    integrations: [browserTracingIntegration()],
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
  })
}

