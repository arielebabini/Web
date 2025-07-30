// Logger placeholder
module.exports = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => console.log('[DEBUG]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args)
};
