/**
 * Normalizes a language name or extension to one of the uppercase Language enum values in schema.prisma.
 * Expected values: 'JAVASCRIPT', 'TYPESCRIPT', 'PYTHON', 'RUBY', 'UNKNOWN'
 * @param {string|null|undefined} lang 
 * @returns {string} Normalized Language enum value
 */
export function mapLanguageToEnum(lang) {
  if (!lang) return 'UNKNOWN';
  
  const clean = lang.trim().toUpperCase();
  const valid = ['JAVASCRIPT', 'TYPESCRIPT', 'PYTHON', 'RUBY'];
  
  if (valid.includes(clean)) return clean;
  
  // Custom aliases & partial matches
  if (clean === 'JS') return 'JAVASCRIPT';
  if (clean === 'TS') return 'TYPESCRIPT';
  if (clean === 'PY') return 'PYTHON';
  if (clean === 'JSX') return 'JAVASCRIPT';
  if (clean === 'TSX') return 'TYPESCRIPT';
  
  return 'UNKNOWN';
}

/**
 * Normalizes a repository status string to one of the uppercase RepoStatus enum values in schema.prisma.
 * Expected values: 'INDEXING', 'READY', 'FAILED'
 * @param {string|null|undefined} status 
 * @returns {string} Normalized RepoStatus enum value
 */
export function mapStatusToEnum(status) {
  if (!status) return 'INDEXING';
  
  const clean = status.trim().toUpperCase();
  const valid = ['INDEXING', 'READY', 'FAILED'];
  
  if (valid.includes(clean)) return clean;
  
  return 'INDEXING';
}

/**
 * Normalizes a chat message role to one of the uppercase MessageRole enum values in schema.prisma.
 * Expected values: 'USER', 'ASSISTANT'
 * @param {string|null|undefined} role 
 * @returns {string} Normalized MessageRole enum value
 */
export function mapRoleToEnum(role) {
  if (!role) return 'USER';
  
  const clean = role.trim().toUpperCase();
  if (clean === 'ASSISTANT') return 'ASSISTANT';
  
  return 'USER';
}
