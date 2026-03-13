import RescueTeamLeader from "./RescueTeamLeader";
import RescueTeamMember from "./RescueTeamMember";

export default function RescueTeam() {

  const isLeader = localStorage.getItem("isLeader") === "true";

  if (isLeader) {
    return <RescueTeamLeader />;
  }

  return <RescueTeamMember />;
}