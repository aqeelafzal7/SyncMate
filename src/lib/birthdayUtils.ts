/**
 * Checks if today is the user's birthday based on local date (MM-DD) matching user.dob (YYYY-MM-DD or MM-DD).
 */
export function checkIsBirthday(dob?: string): boolean {
  if (!dob) return false;
  const today = new Date();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  const currentDay = String(today.getDate()).padStart(2, '0');

  // dob can be YYYY-MM-DD or MM-DD
  const parts = dob.split('-');
  if (parts.length === 3) {
    const dobMonth = parts[1].padStart(2, '0');
    const dobDay = parts[2].padStart(2, '0');
    return currentMonth === dobMonth && currentDay === dobDay;
  } else if (parts.length === 2) {
    const dobMonth = parts[0].padStart(2, '0');
    const dobDay = parts[1].padStart(2, '0');
    return currentMonth === dobMonth && currentDay === dobDay;
  }

  return false;
}

/**
 * Calculates milliseconds remaining until midnight today.
 */
export function getMsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0, 0
  );
  return midnight.getTime() - now.getTime();
}
