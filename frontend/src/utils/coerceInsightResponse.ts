import type { Insight, InsightResponse } from '../types'

/** Normalizes heterogeneous GET /api/insights payloads into typed Insight-or-absent semantics. */
export const coerceFetchedInsightEnvelope = (
  fetchedEnvelope: InsightResponse
): Insight | null => {
  if (fetchedEnvelope.status === 'no insights yet') {
    return null
  }
  const candidateIdentifier = fetchedEnvelope.ID
  const candidateParagraph = fetchedEnvelope.Summary
  const candidateRecommendationsRaw = fetchedEnvelope.Recommendations
  const anomalyCollectionRaw = fetchedEnvelope.Anomalies
  const categoricalSummariesRaw = fetchedEnvelope.TopCategories
  const userIdentifierRaw = fetchedEnvelope.UserID

  const candidateRecommendationList = candidateRecommendationsRaw ?? []
  const anomalyCollectionNormalized = anomalyCollectionRaw ?? []
  const categoricalSummariesNormalized = categoricalSummariesRaw ?? []

  if (
    typeof candidateIdentifier === 'undefined' ||
    typeof candidateParagraph === 'undefined' ||
    typeof userIdentifierRaw === 'undefined'
  ) {
    return null
  }

  return {
    ID: candidateIdentifier,
    UserID: userIdentifierRaw,
    Summary: candidateParagraph,
    TopCategories: categoricalSummariesNormalized,
    Anomalies: anomalyCollectionNormalized,
    Recommendations: candidateRecommendationList,
    CreatedAt: fetchedEnvelope.CreatedAt ?? '',
    UpdatedAt: fetchedEnvelope.UpdatedAt ?? '',
  }
}
