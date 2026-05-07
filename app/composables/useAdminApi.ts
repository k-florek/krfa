type AdminApiMethod = 'GET' | 'POST'

function getAdminApiBaseUrl() {
  const config = useRuntimeConfig()
  return (config.public.checkoutApiBaseUrl || '').replace(/\/$/, '')
}

function getAdminApiUrl(path: string) {
  return `${getAdminApiBaseUrl()}${path}`
}

async function parseAdminApiResponse(response: Response) {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

export const useAdminApi = () => {
  const callAdminApi = async <T>(path: string, method: AdminApiMethod = 'GET', body?: unknown): Promise<T> => {
    const response = await fetch(getAdminApiUrl(path), {
      method,
      credentials: 'include',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
    })

    const payload = await parseAdminApiResponse(response) as { error?: string } & T

    if (!response.ok) {
      throw new Error(payload.error || `Request failed with status ${response.status}.`)
    }

    return payload
  }

  return {
    callAdminApi,
    getAdminApiUrl,
  }
}