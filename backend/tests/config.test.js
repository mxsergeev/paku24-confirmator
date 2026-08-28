describe('database configuration', () => {
  test('selects TEST_MONGODB_URI in test mode even when MONGODB_URI is set', async () => {
    vi.resetModules()
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('MONGODB_URI', 'mongodb://development/confirmator')
    vi.stubEnv('TEST_MONGODB_URI', 'mongodb://test/confirmator')

    const config = await import('../utils/config.js')

    expect(config.MONGODB_URI).toBe('mongodb://test/confirmator')
    vi.unstubAllEnvs()
  })
})
