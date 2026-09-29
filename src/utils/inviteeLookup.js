import { lookupDirectory } from "@/services/claimService";
import { pickData } from "@/services/api";
import { isValidEmail } from "@/utils/invitees";

/** Look up one email: `{ known, name, company, tierLabel, isCtk }`. */
export async function lookupInvitee(email) {
  try {
    return pickData(await lookupDirectory(email.trim())) ?? { known: false };
  } catch {
    return { known: false };
  }
}

/** Fill in any rows that haven't been looked up yet (e.g. Continue clicked straight after typing). */
export async function resolveLookups(invitees) {
  return Promise.all(
    invitees.map(async (row) => {
      if (row.lookup || !isValidEmail(row.email)) return row;
      const lookup = await lookupInvitee(row.email);
      return { ...row, lookup, name: lookup.known ? lookup.name : row.name };
    })
  );
}
