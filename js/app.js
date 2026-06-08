import {
  AUTHORIZED_ROLE_IDS,
  DISCORD_CLIENT_ID,
  GITHUB_WORKFLOW_URL,
  REDIRECT_URI,
  SERVER_ID,
  STAFF_DATA_URL
} from "./config.js";

const roleOrder = [
  "Chairman",
  "Vice Chairman",
  "President",
  "Vice President",
  "Executive Director",
  "Executive Officer",
  "Executive Assistant",
  "General Manager",
  "Manager",
  "Assistant Manager",
  "Supervisor",
  "Staff Assistant",
  "Kitchen Leader",
  "Senior Staff",
  "Staff",
  "Junior Staff"
];

const rankOrder = ["LEADERSHIP", "PRESIDENTIAL", "HR", "MR", "LR"];

const state = {
  accessToken: sessionStorage.getItem("discord_access_token"),
  staff: [],
  filters: {
    role: "",
    rank: "",
    department: ""
  }
};

const els = {
  loginView: document.querySelector("#login-view"),
  databaseView: document.querySelector("#database-view"),
  loginButton: document.querySelector("#login-button"),
  loginStatus: document.querySelector("#login-status"),
  logoutButton: document.querySelector("#logout-button"),
  updateButton: document.querySelector("#update-button"),
  syncStatus: document.querySelector("#sync-status"),
  viewerName: document.querySelector("#viewer-name"),
  roleFilter: document.querySelector("#role-filter"),
  rankFilter: document.querySelector("#rank-filter"),
  departmentFilter: document.querySelector("#department-filter"),
  clearFilters: document.querySelector("#clear-filters"),
  tableBody: document.querySelector("#staff-table-body"),
  emptyState: document.querySelector("#empty-state"),
  visibleCount: document.querySelector("#visible-count"),
  totalCount: document.querySelector("#total-count"),
  lastUpdated: document.querySelector("#last-updated")
};

function buildDiscordLoginUrl() {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "token",
    scope: "identify guilds.members.read"
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

function readTokenFromHash() {
  if (!window.location.hash.includes("access_token")) {
    return null;
  }

  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get("access_token");
  window.history.replaceState({}, document.title, REDIRECT_URI);
  return token;
}

async function fetchDiscord(path, token) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Discord request failed with status ${response.status}`);
  }

  return response.json();
}

function isAuthorized(member) {
  return (member.roles || []).some((roleId) => AUTHORIZED_ROLE_IDS.has(roleId));
}

function setLoginStatus(message) {
  els.loginStatus.textContent = message;
}

function setSyncStatus(message) {
  els.syncStatus.textContent = message;
}

function showLogin(message = "") {
  els.loginView.hidden = false;
  els.databaseView.hidden = true;
  setLoginStatus(message);
}

function showDatabase() {
  els.loginView.hidden = true;
  els.databaseView.hidden = false;
}

async function verifyLogin() {
  if (!state.accessToken) {
    showLogin();
    return;
  }

  setLoginStatus("Checking Discord access...");

  try {
    const [user, member] = await Promise.all([
      fetchDiscord("/users/@me", state.accessToken),
      fetchDiscord(`/users/@me/guilds/${SERVER_ID}/member`, state.accessToken)
    ]);

    if (!isAuthorized(member)) {
      sessionStorage.removeItem("discord_access_token");
      state.accessToken = null;
      showLogin("Only Executive Assistant and higher can log in.");
      return;
    }

    els.viewerName.textContent = user.global_name || user.username;
    showDatabase();
    await loadStaffData();
  } catch (error) {
    sessionStorage.removeItem("discord_access_token");
    state.accessToken = null;
    showLogin("Discord login could not be verified. Please try again.");
  }
}

async function loadStaffData() {
  setSyncStatus("Loading latest staff data...");
  const response = await fetch(`${STAFF_DATA_URL}?t=${Date.now()}`);

  if (!response.ok) {
    throw new Error("Staff data could not be loaded.");
  }

  const payload = await response.json();
  state.staff = payload.staff || [];
  els.totalCount.textContent = state.staff.length.toString();
  els.lastUpdated.textContent = payload.updatedAt
    ? new Date(payload.updatedAt).toLocaleString()
    : "Not synced yet";

  populateFilters();
  renderTable();
  setSyncStatus("Staff data loaded.");
}

function appendOptions(select, values) {
  const first = select.querySelector("option");
  select.replaceChildren(first);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function populateFilters() {
  const presentRoles = new Set(state.staff.map((person) => person.role));
  const roles = roleOrder.filter((role) => presentRoles.has(role));
  const ranks = rankOrder.filter((rank) => state.staff.some((person) => person.rank === rank));
  const departments = [...new Set(state.staff.map((person) => person.department))].sort();

  appendOptions(els.roleFilter, roles);
  appendOptions(els.rankFilter, ranks);
  appendOptions(els.departmentFilter, departments);
}

function getFilteredStaff() {
  return state.staff.filter((person) => {
    return (
      (!state.filters.role || person.role === state.filters.role) &&
      (!state.filters.rank || person.rank === state.filters.rank) &&
      (!state.filters.department || person.department === state.filters.department)
    );
  });
}

function renderTable() {
  const rows = getFilteredStaff();
  els.tableBody.replaceChildren();

  rows.forEach((person) => {
    const tr = document.createElement("tr");
    [person.userId, person.username, person.role, person.rank, person.department].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    });
    els.tableBody.append(tr);
  });

  els.visibleCount.textContent = rows.length.toString();
  els.emptyState.hidden = rows.length > 0;
}

function syncFilter(event) {
  const key = event.currentTarget.id.replace("-filter", "");
  state.filters[key] = event.currentTarget.value;
  renderTable();
}

els.loginButton.addEventListener("click", () => {
  if (DISCORD_CLIENT_ID === "REPLACE_WITH_DISCORD_CLIENT_ID") {
    setLoginStatus("Add your Discord client ID in js/config.js first.");
    return;
  }

  window.location.assign(buildDiscordLoginUrl());
});

els.logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem("discord_access_token");
  state.accessToken = null;
  showLogin("Logged out.");
});

els.updateButton.addEventListener("click", () => {
  if (GITHUB_WORKFLOW_URL === "REPLACE_WITH_GITHUB_ACTIONS_WORKFLOW_URL") {
    setSyncStatus("Add your GitHub Actions workflow URL in js/config.js first.");
    return;
  }

  setSyncStatus("Opening GitHub Actions. Click Run workflow there, then refresh this page after it finishes.");
  window.open(GITHUB_WORKFLOW_URL, "_blank", "noopener,noreferrer");
});

[els.roleFilter, els.rankFilter, els.departmentFilter].forEach((select) => {
  select.addEventListener("change", syncFilter);
});

els.clearFilters.addEventListener("click", () => {
  state.filters.role = "";
  state.filters.rank = "";
  state.filters.department = "";
  els.roleFilter.value = "";
  els.rankFilter.value = "";
  els.departmentFilter.value = "";
  renderTable();
});

const tokenFromHash = readTokenFromHash();

if (tokenFromHash) {
  state.accessToken = tokenFromHash;
  sessionStorage.setItem("discord_access_token", tokenFromHash);
}

verifyLogin();
