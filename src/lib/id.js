// Tiny id + timestamp helpers shared across the data layer.
export const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`
export const nowIso = () => new Date().toISOString()
