import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import RescueTeamLeader from "./RescueTeamLeader";
import RescueTeamMember from "./RescueTeamMember";

import { fetchWithAuth } from "../../services/apiClient";

export default function RescueTeam() {
  // const params = useParams();
  // const teamId = params.teamId;
  const { teamId } = useParams();
  const [loading, setLoading] = useState(true);
  const [isLeader, setIsLeader] = useState(false);

  // const loadTeam = async () => {
  //   try {
  //     const res = await fetchWithAuth(
  //       `/RescueTeams/rescue-team-member-${teamId}`,
  //     );

  //     const json = await res.json();

  //     if (!res.ok || !json?.success) {
  //       console.error("Team API error:", json?.message);
  //       setLoading(false);
  //       return;
  //     }

  //     const members = json?.content?.teamMember ?? [];

  //     const currentUserId = localStorage.getItem("userId");

  //     const currentMember = members.find(
  //       (m) => String(m.userID) === String(currentUserId),
  //     );

  //     setIsLeader(currentMember?.isLeader === true);
  //   } catch (err) {
  //     console.error("Load team error:", err);
  //   }

  //   setLoading(false);
  // };

  // useEffect(() => {
  //   if (teamId) loadTeam();
  // }, [teamId]);

  useEffect(() => {
    const savedLeader = localStorage.getItem("isLeader");
    if (savedLeader === "true" || savedLeader === "True") {
      setIsLeader(true);
      setLoading(false);
      return;
    }
    const loadTeam = async () => {
      try {
        const res = await fetchWithAuth(
          `/RescueTeams/rescue-team-member-${teamId}`,
        );
        const json = await res.json();

        if (!res.ok || !json?.success) {
          console.error("Team API error:", json?.message);
          return;
        }

        const members = json?.content?.teamMember ?? [];
        const currentUserId = localStorage.getItem("userId");
        const currentMember = members.find(
          (m) => String(m.userID ?? m.userId) === String(currentUserId),
        );

        const leader = currentMember?.isLeader === true;
        setIsLeader(leader);
        localStorage.setItem("isLeader", String(leader));
      } catch (err) {
        console.error("Load team error:", err);
      } finally {
        setLoading(false);
      }
    };
    if (teamId) loadTeam();
  }, [teamId]);

  if (loading) {
    return <div style={{ padding: 40 }}>Loading team...</div>;
  }

  return isLeader ? <RescueTeamLeader teamId={teamId} /> : <RescueTeamMember teamId={teamId} />;
}
