import { getAuthContext, unauthorizedResponse } from '@/lib/security/auth'
import { checkRateLimit, getClientRateLimitKey } from '@/lib/security/rate-limit'
import {
  jsonError,
  parseJsonBody,
  serverErrorResponse,
  narrowProfile,
  narrowDocument,
  narrowJobTarget,
} from '@/lib/security/request'
import { analyzeATS } from '@/lib/ats/analyzer'

interface ATSRequestBody {
  profile?: unknown
  document?: unknown
  jobTarget?: unknown
}

export async function POST(request: Request) {
  try {
    // 0. Authentication — analysis endpoints are not public compute.
    const auth = await getAuthContext()
    if (!auth) return unauthorizedResponse()

    // 1. Rate limiting — bound per-user/IP scan frequency.
    const rateKey = getClientRateLimitKey(auth.userId, request, 'ats')
    const rate = checkRateLimit(rateKey)
    if (!rate.allowed) {
      return jsonError(429, 'Too many analysis requests. Please wait before trying again.')
    }

    // 2. Size-capped, structural validation of the request body.
    const body = await parseJsonBody<ATSRequestBody>(request)
    if (!body) {
      return jsonError(400, 'Invalid or oversized request body.')
    }

    const profile = narrowProfile(body.profile)
    const document = narrowDocument(body.document)
    if (!profile || !document) {
      return jsonError(400, 'Missing or malformed required parameters (profile, document).')
    }

    const jobTarget = narrowJobTarget(body.jobTarget) ?? undefined

    // 3. Run the deterministic analyzer.
    const report = analyzeATS(profile, document, auth.userId, jobTarget)
    return Response.json(report)
  } catch (err: unknown) {
    return serverErrorResponse('ATS API', err)
  }
}