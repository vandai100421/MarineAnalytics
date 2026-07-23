import { useMutation } from '@tanstack/react-query'
import { apiUpload } from './client'
import type { ImportSummary, SyncRedisResult } from '../types'

export function useImportFull() {
  return useMutation<ImportSummary, Error, File>({
    mutationFn: (file) => apiUpload<ImportSummary>('/api/v1/import/full', file),
  })
}

export function useSyncRedis() {
  return useMutation<SyncRedisResult, Error, File>({
    mutationFn: (file) => apiUpload<SyncRedisResult>('/api/v1/import/sync/redis', file),
  })
}
