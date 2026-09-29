const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emptyInvitee() {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: "",
    name: "",
    company: "",
    type: "",
    lookup: null,
  };
}

export function isValidEmail(email) {
  return EMAIL_RE.test(email.trim());
}

/** Per-row error messages for the invitee list; an empty object means valid. */
export function validateInvitees(invitees, selfEmail) {
  const errors = {};
  const seen = new Set();
  if (!invitees.some((i) => i.email.trim())) errors.list = "Invite at least one person";
  invitees.forEach((inv) => {
    const email = inv.email.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) errors[inv.key] = "Enter a valid email address";
    else if (selfEmail && email === selfEmail.toLowerCase()) errors[inv.key] = "You're already in this claim";
    else if (seen.has(email)) errors[inv.key] = "This email is already in the list";
    else if (!inv.lookup) errors[inv.key] = "Checking this email…";
    else if (!inv.lookup.known && !inv.type) errors[inv.key] = "Choose company user or person in the claim";
    else if (!inv.lookup.known && !inv.name.trim()) errors[inv.key] = "Add their name";
    seen.add(email);
  });
  return errors;
}

/** The rows the API expects. */
export function toInviteePayload(invitees) {
  return invitees
    .filter((i) => i.email.trim())
    .map((i) => ({
      email: i.email.trim(),
      name: i.lookup?.known ? i.lookup.name : i.name.trim(),
      company: i.company.trim() || undefined,
      type: i.lookup?.known ? undefined : i.type,
    }));
}
