import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendRawEmail: vi.fn(),
  ses: vi.fn(),
}))

vi.mock('aws-sdk', () => ({
  default: {
    config: { update: vi.fn() },
    SES: mocks.ses,
  },
}))

import { sendMailWithAttachment } from '../modules/email/email.awsAPI.js'

describe('email attachments', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    mocks.sendRawEmail.mockReset()
    mocks.sendRawEmail.mockReturnValue({ promise: vi.fn().mockResolvedValue({}) })
    mocks.ses.mockReset()
    mocks.ses.mockReturnValue({ sendRawEmail: mocks.sendRawEmail })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('labels invoice PDF attachments as invoices', async () => {
    await sendMailWithAttachment({
      email: 'customer@example.com',
      subject: 'Invoice 2026-001',
      body: 'Invoice attached.',
      pdfBase64: 'ZmFrZQ==',
      fileName: 'invoice-2026-001.pdf',
      documentType: 'invoice',
    })

    const rawMessage = mocks.sendRawEmail.mock.calls[0][0].RawMessage.Data
    expect(rawMessage).toContain('Content-Description: Invoice PDF')
    expect(rawMessage).toContain('filename="invoice-2026-001.pdf"')
  })

  it('keeps receipt PDF attachments labeled as receipts', async () => {
    await sendMailWithAttachment({
      email: 'customer@example.com',
      subject: 'Receipt 2026-001',
      body: 'Receipt attached.',
      pdfBase64: 'ZmFrZQ==',
      fileName: 'receipt-2026-001.pdf',
    })

    const rawMessage = mocks.sendRawEmail.mock.calls[0][0].RawMessage.Data
    expect(rawMessage).toContain('Content-Description: Receipt PDF')
  })
})
