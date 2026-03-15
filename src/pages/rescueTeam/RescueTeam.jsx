import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import RescueTeamLeader from "./RescueTeamLeader";
import RescueTeamMember from "./RescueTeamMember";

import { fetchWithAuth } from "../../services/apiClient";
export default function RescueTeam() {
  const params = useParams();
  const teamId = params.teamId || localStorage.getItem("teamId");

  const [loading, setLoading] = useState(true);
  const [isLeader, setIsLeader] = useState(false);

  const loadTeam = async () => {
    try {
      const res = await fetchWithAuth(
        `/RescueTeams/rescue-team-member-${teamId}`,
      );

      const json = await res.json();

      if (!res.ok || !json?.success) {
        console.error("Team API error:", json?.message);
        setLoading(false);
        return;
      }

      const members = json?.content?.teamMember ?? [];

      const currentUserId = localStorage.getItem("userId");

      const currentMember = members.find(
        (m) => String(m.userID) === String(currentUserId),
      );

      setIsLeader(currentMember?.isLeader === true);
    } catch (err) {
      console.error("Load team error:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (teamId) loadTeam();
  }, [teamId]);

  if (loading) {
    return <div style={{ padding: 40 }}>Loading team...</div>;
  }

  return isLeader ? <RescueTeamLeader /> : <RescueTeamMember />;
}
