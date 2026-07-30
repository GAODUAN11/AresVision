export function resolveWaveDiagnosticsSource({
  variable,
  baseVariable = null,
  baseData = null,
  baseLoading = false,
}) {
  if (baseVariable && variable === baseVariable) {
    return {
      shouldFetch: false,
      loading: Boolean(baseLoading),
      data: baseLoading ? null : (baseData || null),
    };
  }

  return {
    shouldFetch: true,
    loading: true,
    data: null,
  };
}
