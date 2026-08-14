const NOTIFICATION_VISUALS = {
  approved: {
    icon: '✓',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.30)',
  },
  rejected: {
    icon: '✕',
    color: '#c75b39',
    bg: 'rgba(199,91,57,0.12)',
    border: 'rgba(199,91,57,0.30)',
  },
  training_oom: {
    icon: '!',
    color: '#d95c5c',
    bg: 'rgba(217,92,92,0.12)',
    border: 'rgba(217,92,92,0.30)',
  },
  default: {
    icon: '⚠',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.30)',
  },
};

export function getNotificationVisual(type) {
  return NOTIFICATION_VISUALS[type] || NOTIFICATION_VISUALS.default;
}

export function getRelatedTrainingTaskId(notification) {
  const taskId = Number(notification?.related_training_task_id);
  return Number.isInteger(taskId) && taskId > 0 ? taskId : null;
}
