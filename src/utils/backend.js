export const getBackendUrl = () => import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'

export const wakeBackend = async () => {
  try {
    await fetch(`${getBackendUrl()}/health`, {
      method: 'GET',
      cache: 'no-store',
    })
  } catch (error) {
    console.warn('Backend wake-up ping failed:', error)
  }
}
