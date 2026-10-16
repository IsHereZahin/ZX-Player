export const types = { allFiles: '*/*', plainText: 'text/plain' };

export const errorCodes = {
  OPERATION_CANCELED: 'OPERATION_CANCELED',
  IN_PROGRESS: 'ASYNC_OP_IN_PROGRESS',
  UNABLE_TO_OPEN_FILE_TYPE: 'UNABLE_TO_OPEN_FILE_TYPE',
  NULL_PRESENTER: 'NULL_PRESENTER',
};

export const isErrorWithCode = (
  error: unknown,
): error is Error & { code: string } =>
  typeof error === 'object' && error !== null && 'code' in error;

export const pick = jest.fn();
export const keepLocalCopy = jest.fn();
