let DATA = null;
let TEAMS_BY_ID = {};

async function loadData() {
  const res = await fetch("data.json?" + Date.now());
  DATA = await res.json();
  TEAMS_BY_ID = {};
  DATA.teams.forEach(t => TEAMS_BY_ID[t.id] = t);

  renderGroups();
  renderSchedule();
  renderStandings();
  renderKnockout();
}

function renderGroups() {
  const groupA = DATA.teams.filter(t => t.group === "A");
  const groupB = DATA.teams.filter(t => t.group === "B");

  const wrap = teams => teams
    .map(t => `<div class="team-pill"><span class="code">${t.shortName}</span><span>${t.name}</span></div>`)
    .join("");

  document.getElementById("group-A").innerHTML = wrap(groupA);
  document.getElementById("group-B").innerHTML = wrap(groupB);
}

function groupMatchesByRound(groupName) {
  const matches = DATA.matches.filter(m => m.stage === "GROUP" && m.group === groupName);
  const byRound = {};
  matches.forEach(m => {
    if (!byRound[m.round]) byRound[m.round] = [];
    byRound[m.round].push(m);
  });
  const rounds = Object.keys(byRound).sort((a,b) => a-b);
  return rounds.map(r => ({ round: Number(r), matches: byRound[r] }));
}

function formatScore(m) {
  if (m.homeScore === null || m.awayScore === null) return "Chưa đá";
  return `${m.homeScore} : ${m.awayScore}`;
}

function renderSchedule() {
  const renderGroupSchedule = (groupName, containerId) => {
    const rounds = groupMatchesByRound(groupName);
    const container = document.getElementById(containerId);
    if (!rounds.length) {
      container.innerHTML = `<span class="badge-placeholder">Chưa có lịch thi đấu</span>`;
      return;
    }
    let html = "";
    rounds.forEach(r => {
      html += `<div class="round-block">
        <div class="round-title">Vòng ${r.round}</div>`;
      r.matches.forEach(m => {
        const home = TEAMS_BY_ID[m.homeTeamId];
        const away = TEAMS_BY_ID[m.awayTeamId];
        const isFinished = m.status === "FINISHED" && m.homeScore !== null && m.awayScore !== null;
        html += `<div class="match-card">
          <div class="match-teams">
            <span class="team-name">${home.shortName}</span>
            <span class="vs">vs</span>
            <span class="team-name">${away.shortName}</span>
          </div>
          <div>
            <div class="match-meta">${m.date} • ${m.time} • ${m.stadium}</div>
          </div>
          <div class="score-badge ${isFinished ? "score-finished" : "score-scheduled"}">
            ${formatScore(m)}
          </div>
        </div>`;
      });
      html += `</div>`;
    });
    container.innerHTML = html;
  };

  renderGroupSchedule("A", "schedule-A");
  renderGroupSchedule("B", "schedule-B");

  // Tab switching
  document.querySelectorAll(".tab-button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });
}

function calculateStandings(groupName) {
  const teams = DATA.teams.filter(t => t.group === groupName);
  const stats = {};
  teams.forEach(t => {
    stats[t.id] = {
      team: t,
      played: 0,
      win: 0,
      draw: 0,
      lose: 0,
      gf: 0,
      ga: 0,
      points: 0
    };
  });

  const matches = DATA.matches.filter(m => m.stage === "GROUP" && m.group === groupName);
  matches.forEach(m => {
    if (m.status !== "FINISHED" || m.homeScore === null || m.awayScore === null) return;
    const home = stats[m.homeTeamId];
    const away = stats[m.awayTeamId];
    if (!home || !away) return;

    home.played++; away.played++;
    home.gf += m.homeScore; home.ga += m.awayScore;
    away.gf += m.awayScore; away.ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.win++; away.lose++; home.points += 3;
    } else if (m.homeScore < m.awayScore) {
      away.win++; home.lose++; away.points += 3;
    } else {
      home.draw++; away.draw++; home.points++; away.points++;
    }
  });

  const arr = Object.values(stats);
  arr.forEach(s => { s.gd = s.gf - s.ga; });
  arr.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.name.localeCompare(b.team.name);
  });
  return arr;
}

function renderStandings() {
  const renderTable = (groupName, tableId) => {
    const data = calculateStandings(groupName);
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = data.map(s => `
      <tr>
        <td>${s.team.shortName}</td>
        <td>${s.played}</td>
        <td>${s.win}</td>
        <td>${s.draw}</td>
        <td>${s.lose}</td>
        <td>${s.gf}</td>
        <td>${s.ga}</td>
        <td>${s.gd}</td>
        <td>${s.points}</td>
      </tr>
    `).join("");
  };
  renderTable("A", "ranking-A");
  renderTable("B", "ranking-B");
}

function getGroupTop(groupName, rank) {
  const table = calculateStandings(groupName);
  if (table.length >= rank) return table[rank - 1].team;
  return null;
}

function findMatchByCode(code) {
  return DATA.matches.find(m => m.code === code);
}

function resolveSlot(slotText) {
  if (!slotText) return null;
  const parts = slotText.split(" ");
  if (parts[0] === "Nhất") {
    const group = parts[1];
    return getGroupTop(group, 1);
  }
  if (parts[0] === "Nhì") {
    const group = parts[1];
    return getGroupTop(group, 2);
  }
  if (parts[0] === "Thắng" || parts[0] === "Thua") {
    const sfCode = parts[1]; // SF1 / SF2
    const sf = findMatchByCode(sfCode);
    if (!sf || sf.status !== "FINISHED" || sf.homeScore === null || sf.awayScore === null) return null;
    const homeTeam = TEAMS_BY_ID[sf.homeTeamId];
    const awayTeam = TEAMS_BY_ID[sf.awayTeamId];
    if (!homeTeam || !awayTeam) return null;
    const homeWin = sf.homeScore > sf.awayScore;
    const isWinner = parts[0] === "Thắng";
    if (isWinner) {
      return homeWin ? homeTeam : awayTeam;
    } else {
      return homeWin ? awayTeam : homeTeam;
    }
  }

  return null;
}

function getKnockoutTeams(match) {
  let home = null, away = null;
  if (match.homeTeamId) home = TEAMS_BY_ID[match.homeTeamId];
  if (match.awayTeamId) away = TEAMS_BY_ID[match.awayTeamId];

  if (!home && match.homeFrom) home = resolveSlot(match.homeFrom);
  if (!away && match.awayFrom) away = resolveSlot(match.awayFrom);

  return { home, away };
}

function renderKnockout() {
  const sfMatches = DATA.matches.filter(m => m.stage === "SF");
  const third = DATA.matches.find(m => m.stage === "THIRD");
  const finalM = DATA.matches.find(m => m.stage === "FINAL");

  const renderKOCard = (label, match) => {
    if (!match) return "";
    const { home, away } = getKnockoutTeams(match);
    const homeName = home ? home.name : (match.homeFrom || "Chưa xác định");
    const awayName = away ? away.name : (match.awayFrom || "Chưa xác định");
    const isFinished = match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null;
    return `<div class="match-card">
      <div class="match-teams">
        <span class="team-name">${homeName}</span>
        <span class="vs">vs</span>
        <span class="team-name">${awayName}</span>
      </div>
      <div>
        <div class="match-meta">${match.date} • ${match.time} • ${match.stadium}</div>
        <div class="match-meta">${label}</div>
      </div>
      <div class="score-badge ${isFinished ? "score-finished" : "score-scheduled"}">
        ${formatScore(match)}
      </div>
    </div>`;
  };

  document.getElementById("sf-list").innerHTML =
    sfMatches.map((m, idx) => renderKOCard(m.name || `Bán kết ${idx+1}`, m)).join("");

  document.getElementById("third-match").innerHTML = third ? renderKOCard(third.name, third) : "";
  document.getElementById("final-match").innerHTML = finalM ? renderKOCard(finalM.name, finalM) : "";
}

loadData();
