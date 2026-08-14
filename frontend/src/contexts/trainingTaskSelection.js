export function reconcileActiveTrainingTaskId(tasks, preferredTaskId) {
  const availableTasks = Array.isArray(tasks) ? tasks : [];

  if (availableTasks.some((task) => task.id === preferredTaskId)) {
    return preferredTaskId;
  }

  const runningTask = availableTasks.find(
    (task) => task.status === 'running' || task.status === 'pending'
  );

  return runningTask?.id ?? null;
}
