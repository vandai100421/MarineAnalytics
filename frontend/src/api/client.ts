const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(
      errorBody.detail ?? `API error ${response.status}: ${response.statusText}`,
    )
  }

  return response.json() as Promise<T>
}

export async function downloadCSV(path: string, filename: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(
      errorBody.detail ?? `Upload error ${response.status}: ${response.statusText}`,
    )
  }

  return response.json() as Promise<T>
}
