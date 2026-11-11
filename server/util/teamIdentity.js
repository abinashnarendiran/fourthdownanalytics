const getTeamIdentity = (roster, user, { useRosterMetadata = false } = {}) => {
  const displayName = roster.owner?.display_name;
  const teamName =
    user?.metadata?.team_name ||
    (useRosterMetadata ? roster.metadata?.team_name : null) ||
    (displayName ? `Team ${displayName}` : "Unknown");

  return {
    owner: displayName || "Unknown",
    teamName,
  };
};

module.exports = { getTeamIdentity };
