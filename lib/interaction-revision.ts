export function shouldApplyInteractionRevision(
    existingRevision: number,
    incomingRevision: number
) {
    return existingRevision < incomingRevision;
}
