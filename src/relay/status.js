const ERROR_STATUS = 'error';

function isTerminalErrorStatus(status) {
  return status === ERROR_STATUS || status === 'failed';
}

module.exports = {
  ERROR_STATUS,
  isTerminalErrorStatus,
};
