import {
  chunkMessageForSending,
  constructCancellationMessage,
  constructMessage,
  sendSmsInChunks,
} from '../modules/sms/sms.helpers.js'
import { smsOrderPayload } from './test_helper.js'

describe('SMS chunking helpers', () => {
  test('keeps multi-part GSM message within three-part batches', () => {
    const longMessage = 'A'.repeat(500)
    const { chunks, totalSegments } = chunkMessageForSending(longMessage)

    expect(totalSegments).toBeGreaterThan(3)
    expect(chunks.length).toBe(Math.ceil(totalSegments / 3))
    expect(chunks[0].length).toBeLessThanOrEqual(3 * 153)
    expect(chunks.slice(1).join('').length).toBe(longMessage.length - chunks[0].length)
  })

  test('treats unicode-only payload as UCS-2 segments', () => {
    const unicodeMessage = '🚚'.repeat(150)
    const { chunks } = chunkMessageForSending(unicodeMessage)
    const codePointCount = [...chunks[0]].length

    expect(codePointCount).toBeLessThanOrEqual(3 * 67)
  })

  test('returns a single chunk for short payloads', () => {
    const shortMessage = 'Kiitos varauksestasi'
    const { chunks, totalSegments } = chunkMessageForSending(shortMessage)

    expect(totalSegments).toBe(1)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe(shortMessage)
  })

  test('throws when SMS exceeds default chunk limit', async () => {
    const longMessage = 'A'.repeat(1400)
    await expect(sendSmsInChunks('0412345678', longMessage)).rejects.toThrow('exceeds the limit')
  })
})

describe('SMS order rendering', () => {
  test('uses active service, fee, box price, and total price values', () => {
    const message = constructMessage({
      ...smsOrderPayload,
      duration: 2,
      service: {
        ...smsOrderPayload.service,
        name: 'Active service',
        pricePerHour: 100,
      },
      pricingOverrides: {
        price: 308,
        fees: [{ name: 'nightFee', label: 'YÖ/AAMULISÄ', amount: 20 }],
        boxesPrice: 88,
      },
      boxes: {
        ...smsOrderPayload.boxes,
        amount: 2,
        deliveryDate: new Date('2021-04-22T17:00:00.000Z'),
        returnDate: new Date('2021-04-24T17:00:00.000Z'),
      },
    })

    expect(message).toContain('2h (50€/h, Active service)')
    expect(message).toContain('YÖ/AAMULISÄ\n20€')
    expect(message).toContain('Hinta: 88€')
    expect(message).toContain('ARVIOITU HINTA\n308€')
  })

  test('uses Helsinki time in cancellation messages', () => {
    const message = constructCancellationMessage({
      name: 'Test Customer',
      date: '2026-01-15T07:00:00.000Z',
      service: { name: 'Service' },
    })

    expect(message).toContain('Service 15.01.2026 09:00')
  })
})
