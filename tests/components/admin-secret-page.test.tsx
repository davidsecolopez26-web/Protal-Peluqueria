import { describe, it, expect } from 'vitest'
import AdminSecretPage from '@/app/admin/[adminSecret]/page'

describe('AdminSecretPage', () => {
  it('passes the unwrapped adminSecret string to the login component', async () => {
    const element = await AdminSecretPage({
      params: Promise.resolve({ adminSecret: 'admin-secret' }),
    })

    expect(element.props.secretToken).toBe('admin-secret')
  })
})
