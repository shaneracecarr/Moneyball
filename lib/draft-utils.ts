/**
 * Given an overall pick number (1-based) and number of teams,
 * returns the round and the position within that round.
 * Snake draft: odd rounds go 1→N, even rounds go N→1.
 */
export function getSnakeDraftPosition(
  pickNumber: number,
  numberOfTeams: number
): { round: number; positionInRound: number } {
  const round = Math.ceil(pickNumber / numberOfTeams);
  const pickInRound = ((pickNumber - 1) % numberOfTeams) + 1;

  // Odd rounds: normal order (1→N), Even rounds: reversed (N→1)
  const positionInRound =
    round % 2 === 1 ? pickInRound : numberOfTeams - pickInRound + 1;

  return { round, positionInRound };
}

/**
 * Returns the member ID whose turn it is for a given pick number.
 */
export function getMemberIdForPick(
  pickNumber: number,
  numberOfTeams: number,
  draftOrder: { memberId: string; position: number }[]
): string | undefined {
  const { positionInRound } = getSnakeDraftPosition(pickNumber, numberOfTeams);
  const entry = draftOrder.find((o) => o.position === positionInRound);
  return entry?.memberId;
}
