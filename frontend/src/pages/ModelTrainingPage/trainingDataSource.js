const SERVER_TRAINING_DATA_SOURCE = 'default';

export function getTrainingRequestDataSource() {
  return SERVER_TRAINING_DATA_SOURCE;
}

export function getTrainingSourceLabel(_source = SERVER_TRAINING_DATA_SOURCE, { isZh = true } = {}) {
  return isZh ? '服务器托管数据' : 'Server-managed data';
}
