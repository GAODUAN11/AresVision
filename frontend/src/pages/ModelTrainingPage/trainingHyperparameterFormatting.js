export function formatBooleanHyperparameterValue(value, t) {
  return value
    ? t('modelTraining.hypers.booleanEnabled')
    : t('modelTraining.hypers.booleanDisabled');
}
