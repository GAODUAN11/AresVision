export function buildExpandedCardSnapshot(getAiInsight, expandedCard) {
  if (!expandedCard || typeof getAiInsight !== 'function') return null;

  const primarySnapshot = getAiInsight(expandedCard) || null;
  if (expandedCard !== 'wave') return primarySnapshot;

  const diagnosticsSnapshot = getAiInsight('waveDiag') || null;
  if (!diagnosticsSnapshot) return primarySnapshot;

  if (!primarySnapshot || typeof primarySnapshot !== 'object' || Array.isArray(primarySnapshot)) {
    return {
      card: 'wave',
      wave: primarySnapshot,
      diagnostics: diagnosticsSnapshot,
    };
  }

  return {
    ...primarySnapshot,
    diagnostics: diagnosticsSnapshot,
  };
}
