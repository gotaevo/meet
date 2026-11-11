/**
 * Shareable link for a room: includes the invite code (so people without an
 * account can join) and keeps the #hash (end-to-end encryption passphrase).
 */
export function inviteUrl(roomName: string, inviteCode: string) {
  const { origin, hash } = window.location;
  return `${origin}/rooms/${encodeURIComponent(roomName)}?convite=${inviteCode}${hash}`;
}

/** Short version to display (without protocol and passphrase). */
export function inviteLabel(roomName: string) {
  return `${window.location.host}/rooms/${roomName}`;
}
