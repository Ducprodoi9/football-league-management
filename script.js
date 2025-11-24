async function loadData() {
    const res = await fetch("data.json");
    const data = await res.json();
    renderGroups(data);
    const schedules = generateSchedules(data.groups);
    renderSchedules(schedules);
}

function renderGroups(data) {
    document.getElementById("groupA").innerHTML =
        data.groups.A.map(t => `<div>${t.name}</div>`).join("");

    document.getElementById("groupB").innerHTML =
        data.groups.B.map(t => `<div>${t.name}</div>`).join("");
}

// ----------------- SINH LỊCH VÒNG BẢNG -----------------------

function generateSchedules(groups) {
    return {
        A: roundRobin(groups.A),
        B: roundRobin(groups.B)
    };
}

function roundRobin(teams) {
    let list = [...teams];
    const n = list.length;
    const rounds = n - 1;
    const schedule = [];

    if (n % 2 === 1) list.push(null);

    for (let r = 0; r < rounds; r++) {
        let round = [];
        for (let i = 0; i < n / 2; i++) {
            let home = list[i];
            let away = list[n - 1 - i];
            if (home && away) {
                round.push({
                    round: r + 1,
                    home: home.name,
                    away: away.name
                });
            }
        }
        schedule.push(round);
        list.splice(1, 0, list.pop());
    }

    return schedule;
}

function renderSchedules(schedules) {
    let html = "";

    html += `<h3>Bảng A</h3>`;
    schedules.A.forEach((round, i) => {
        html += `<h4>Vòng ${i + 1}</h4>`;
        round.forEach(m => {
            html += `<div class='match'>${m.home} vs ${m.away}</div>`;
        });
    });

    html += `<h3>Bảng B</h3>`;
    schedules.B.forEach((round, i) => {
        html += `<h4>Vòng ${i + 1}</h4>`;
        round.forEach(m => {
            html += `<div class='match'>${m.home} vs ${m.away}</div>`;
        });
    });

    document.getElementById("schedule").innerHTML = html;
}

loadData();
