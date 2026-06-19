(function () {
  "use strict";

  var E = window.GREngine;
  var ROLES = E.ROLES;
  var ROLE_NAMES = E.ROLE_NAMES;
  var REGION_NAMES = E.REGION_NAMES;

  var index = E.buildIndex(window.GAME_TEAMS);
  var playersByRole = buildPlayersByRole(index.seasons);
  var selection = {};
  ROLES.forEach(function (role) {
    selection[role] = null;
  });

  var pickersEl = document.getElementById("pickers");
  var btnRun = document.getElementById("btn-run");
  var btnClear = document.getElementById("btn-clear");
  var btnRerun = document.getElementById("btn-rerun");
  var btnEdit = document.getElementById("btn-edit");
  var runHint = document.getElementById("run-hint");
  var resultPanel = document.getElementById("result-panel");

  function buildPlayersByRole(seasons) {
    var map = {};
    ROLES.forEach(function (role) {
      map[role] = [];
    });
    seasons.forEach(function (s) {
      map[s.role].push(s);
    });
    ROLES.forEach(function (role) {
      map[role].sort(function (a, b) {
        if (a.name !== b.name) return a.name.localeCompare(b.name);
        if (a.year !== b.year) return b.year - a.year;
        return a.teamName.localeCompare(b.teamName);
      });
    });
    return map;
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function ordinal(n) {
    if (n == null) return "—";
    var s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function usedPlayerIds(exceptRole) {
    var ids = new Set();
    ROLES.forEach(function (role) {
      if (role === exceptRole) return;
      var picked = selection[role];
      if (picked) ids.add(picked.playerId);
    });
    return ids;
  }

  function allRegions() {
    var set = new Set();
    index.seasons.forEach(function (s) {
      set.add(s.region);
    });
    return Array.from(set).sort();
  }

  function optionLabel(p) {
    return p.name + " · " + p.teamName + " · " + p.region + " " + p.year + " · RTG " + p.rating;
  }

  function filteredPlayers(role, query, region) {
    var used = usedPlayerIds(role);
    var q = query.trim().toLowerCase();
    return playersByRole[role].filter(function (p) {
      if (used.has(p.playerId)) return false;
      if (region && p.region !== region) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().indexOf(q) >= 0 ||
        p.teamName.toLowerCase().indexOf(q) >= 0 ||
        String(p.year).indexOf(q) >= 0 ||
        p.region.toLowerCase().indexOf(q) >= 0
      );
    });
  }

  function renderPicker(role) {
    var picked = selection[role];
    var selectedHtml = picked
      ? '<div class="name">' + esc(picked.name) + '</div>' +
        '<div class="meta">' + esc(picked.teamName) + " · " + esc(REGION_NAMES[picked.region] || picked.region) +
        " · " + picked.year + " · Rating " + picked.rating + "</div>"
      : "선수를 선택하세요";

    return (
      '<div class="picker' + (picked ? " filled" : "") + '" data-role="' + role + '">' +
        '<div class="picker-label"><strong>' + ROLE_NAMES[role] + '</strong><span>' + playersByRole[role].length + "명</span></div>" +
        '<div class="picker-selected' + (picked ? "" : " empty") + '">' + selectedHtml + "</div>" +
        '<div class="picker-controls">' +
          '<input type="search" placeholder="이름, 팀, 지역, 연도 검색" data-filter="' + role + '" value="" />' +
          '<select data-region="' + role + '">' +
            '<option value="">모든 지역</option>' +
            allRegions().map(function (r) {
              return '<option value="' + esc(r) + '">' + esc(REGION_NAMES[r] || r) + "</option>";
            }).join("") +
          "</select>" +
          '<select data-player="' + role + '">' +
            '<option value="">— 선수 선택 —</option>' +
            buildPlayerOptions(role, "", "") +
          "</select>" +
        "</div>" +
      "</div>"
    );
  }

  function buildPlayerOptions(role, query, region) {
    var list = filteredPlayers(role, query, region);
    return list.map(function (p) {
      var key = p.playerId + "|" + p.teamId + "|" + p.year + "|" + p.role;
      return '<option value="' + esc(key) + '">' + esc(optionLabel(p)) + "</option>";
    }).join("");
  }

  function refreshPlayerSelect(role) {
    var picker = pickersEl.querySelector('.picker[data-role="' + role + '"]');
    if (!picker) return;
    var query = picker.querySelector('[data-filter="' + role + '"]').value;
    var region = picker.querySelector('[data-region="' + role + '"]').value;
    var select = picker.querySelector('[data-player="' + role + '"]');
    var prev = select.value;
    select.innerHTML = '<option value="">— 선수 선택 —</option>' + buildPlayerOptions(role, query, region);
    if (prev && select.querySelector('option[value="' + CSS.escape(prev) + '"]')) {
      select.value = prev;
    }
  }

  function renderPickers() {
    pickersEl.innerHTML = ROLES.map(renderPicker).join("");
    updateRunState();
  }

  function findPlayerByKey(key) {
    var parts = key.split("|");
    if (parts.length !== 4) return null;
    var playerId = parts[0];
    var teamId = parts[1];
    var year = Number(parts[2]);
    var role = parts[3];
    var list = playersByRole[role];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p.playerId === playerId && p.teamId === teamId && p.year === year && p.role === role) {
        return p;
      }
    }
    return null;
  }

  function updateRunState() {
    var complete = ROLES.every(function (role) {
      return selection[role];
    });
    btnRun.disabled = !complete;
    runHint.textContent = complete
      ? "5명이 모두 선택되었습니다. 시뮬레이션을 실행하세요."
      : "5명 모두 선택하면 시뮬레이션을 실행할 수 있습니다.";
  }

  function clearSelection() {
    ROLES.forEach(function (role) {
      selection[role] = null;
    });
    resultPanel.classList.add("hidden");
    renderPickers();
  }

  function buildRoad(stages) {
    var N = stages.length;
    var colW = 100 / N;
    var pts = [];
    var nodes = "";

    stages.forEach(function (st, i) {
      var isTop = i % 2 === 0;
      var x = (i + 0.5) * colW;
      var y = isTop ? 32 : 68;
      pts.push(x.toFixed(2) + "," + y);
      var champ = st.place === 1;
      var miss = st.international && !st.qualified;
      var finale = st.key === "worlds";
      var caption = miss ? "미진출" : ordinal(st.place) + " place";
      var accent = champ ? "👑" : (finale && !miss ? "🏆" : "");
      var bcls = "rn-badge" + (champ ? " champ" : (miss ? " miss" : "")) + (finale ? " finale" : "");
      var ncls = "road-node " + (isTop ? "top" : "bottom") + (champ ? " champ" : "") + (miss ? " miss" : "") + (finale ? " finale" : "");
      nodes +=
        '<div class="' + ncls + '" style="left:' + x + "%;top:" + y + '%">' +
          '<div class="' + bcls + '">' + accent + (miss ? "✕" : st.place) + "</div>" +
          '<div class="rn-text"><span class="rn-stage">' + esc(st.label) + '</span><span class="rn-place">' + caption + "</span></div>" +
        "</div>";
    });

    return (
      '<svg class="road-track" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
        '<defs><linearGradient id="roadgrad" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0" stop-color="#5a4f38"/><stop offset="1" stop-color="#c8aa6e"/></linearGradient></defs>' +
        '<polyline class="road-line" points="' + pts.join(" ") + '" fill="none" stroke="url(#roadgrad)" vector-effect="non-scaling-stroke"/>' +
      "</svg>" + nodes
    );
  }

  function verdictSub(result) {
    if (result.golden) {
      return "Split 1 · First Stand · Split 2 · MSI · Split 3 · Worlds — 모두 1위. Golden Road 완주.";
    }
    var w = result.stages[5];
    if (w.qualified && w.place === 1) return "월즈 우승했지만 전 대회 1위는 아닙니다.";
    if (w.qualified) return "Worlds 진출 후 " + ordinal(w.place) + "위.";
    var s3 = result.stages[4];
    if (s3.place <= 4) return "Worlds 직전까지는 갔지만 본선 진출에는 실패.";
    return "여기서 시즌이 끝났습니다. 로스터를 바꿔 다시 시도해 보세요.";
  }

  function runSimulation() {
    var roster = ROLES.map(function (role) {
      return selection[role];
    });
    var ratings = roster.map(function (p) {
      return p.rating;
    });
    var teamRating = E.teamRating(ratings);
    var result = E.simulateRun(teamRating);

    document.getElementById("team-rating").textContent = teamRating;
    document.getElementById("result-subtitle").textContent =
      "선수 Rating 평균 " + teamRating + "점 기준 · Split 1 → First Stand → Split 2 → MSI → Split 3 → Worlds";

    document.getElementById("roster-summary").innerHTML = roster.map(function (p) {
      return (
        '<div class="rs-row">' +
          '<span class="rs-role">' + ROLE_NAMES[p.role] + "</span>" +
          '<span class="rs-name">' + esc(p.name) + "</span>" +
          '<span class="rs-team">' + esc(p.teamName) + " · " + esc(p.region) + " " + p.year + "</span>" +
          '<span class="rs-rating">RTG ' + p.rating + '</span>' +
        "</div>"
      );
    }).join("");

    document.getElementById("road").innerHTML = buildRoad(result.stages);
    document.getElementById("verdict").innerHTML =
      '<div class="verdict ' + (result.golden ? "win" : "fail") + '">' +
        (result.golden ? "🏆 GOLDEN ROAD COMPLETED 🏆" : "GOLDEN ROAD FAILED") +
        '<div class="verdict-sub">' + verdictSub(result) + "</div>" +
      "</div>";

    resultPanel.classList.remove("hidden");
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  pickersEl.addEventListener("input", function (e) {
    var role = e.target.getAttribute("data-filter");
    if (!role) return;
    refreshPlayerSelect(role);
  });

  pickersEl.addEventListener("change", function (e) {
    var regionRole = e.target.getAttribute("data-region");
    if (regionRole) {
      refreshPlayerSelect(regionRole);
      return;
    }

    var playerRole = e.target.getAttribute("data-player");
    if (!playerRole) return;

    var key = e.target.value;
    if (!key) {
      selection[playerRole] = null;
    } else {
      selection[playerRole] = findPlayerByKey(key);
    }

    renderPickers();
    ROLES.forEach(function (role) {
      if (role !== playerRole) refreshPlayerSelect(role);
    });
  });

  btnRun.addEventListener("click", runSimulation);
  btnRerun.addEventListener("click", runSimulation);
  btnClear.addEventListener("click", clearSelection);
  btnEdit.addEventListener("click", function () {
    resultPanel.classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  renderPickers();
})();
