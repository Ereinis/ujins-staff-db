import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const GUILD_ID = "1446923448822665380";
const API_BASE = "https://discord.com/api/v10";

const roleDefinitions = [
  { name: "Chairman", id: "1448496065119518762", rank: "LEADERSHIP" },
  { name: "Vice Chairman", id: "1448497242515439706", rank: "LEADERSHIP" },
  { name: "President", id: "1448499081717743678", rank: "PRESIDENTIAL" },
  { name: "Vice President", id: "1448499105755304019", rank: "PRESIDENTIAL" },
  { name: "Executive Director", id: "1448500020625281085", rank: "HR" },
  { name: "Executive Officer", id: "1448500129140314122", rank: "HR" },
  { name: "Executive Assistant", id: "1448500158617747466", rank: "HR" },
  { name: "General Manager", id: "1448501331567575173", rank: "MR" },
  { name: "Manager", id: "1448502303404331070", rank: "MR" },
  { name: "Assistant Manager", id: "1448502265454264441", rank: "MR" },
  { name: "Supervisor", id: "1448502339022487720", rank: "MR" },
  { name: "Staff Assistant", id: "1448502373055205416", rank: "MR" },
  { name: "Kitchen Leader", id: "1448502776605839543", rank: "LR" },
  { name: "Senior Staff", id: "1448502830938980565", rank: "LR" },
  { name: "Staff", id: "1448502855731249324", rank: "LR" },
  { name: "Junior Staff", id: "1448502882868531362", rank: "LR" }
];

const departments = [
  { name: "Human Resources", id: "1455280224412631094" },
  { name: "Public Relations", id: "1455280020472725699" },
  { name: "Operations", id: "1455280261737611406" }
];

const roleById = new Map(roleDefinitions.map((role, index) => [role.id, { ...role, order: index }]));

function getHighestStaffRole(roleIds) {
  return roleIds
    .map((roleId) => roleById.get(roleId))
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)[0];
}

function getDepartment(roleIds) {
  const department = departments.find((item) => roleIds.includes(item.id));
  return department?.name || "N/A";
}

async function discordFetch(pathname) {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    throw new Error("Missing DISCORD_BOT_TOKEN environment variable.");
  }

  const response = await fetch(`${API_BASE}${pathname}`, {
    headers: {
      Authorization: `Bot ${token}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord API failed: ${response.status} ${body}`);
  }

  return response.json();
}

async function fetchAllMembers() {
  const members = [];
  let after = "0";

  while (true) {
    const page = await discordFetch(`/guilds/${GUILD_ID}/members?limit=1000&after=${after}`);
    members.push(...page);

    if (page.length < 1000) {
      break;
    }

    after = page.at(-1).user.id;
  }

  return members;
}

function toStaffRecord(member) {
  const role = getHighestStaffRole(member.roles || []);

  if (!role) {
    return null;
  }

  return {
    userId: member.user.id,
    username: member.user.global_name || member.nick || member.user.username,
    role: role.name,
    rank: role.rank,
    department: getDepartment(member.roles || [])
  };
}

const members = await fetchAllMembers();
const staff = members
  .map(toStaffRecord)
  .filter(Boolean)
  .sort((a, b) => {
    const roleDelta =
      roleDefinitions.findIndex((role) => role.name === a.role) -
      roleDefinitions.findIndex((role) => role.name === b.role);

    return roleDelta || a.username.localeCompare(b.username);
  });

const output = {
  updatedAt: new Date().toISOString(),
  guildId: GUILD_ID,
  staff
};

const dataDir = path.join(rootDir, "data");
await mkdir(dataDir, { recursive: true });
await writeFile(path.join(dataDir, "staff.json"), `${JSON.stringify(output, null, 2)}\n`);

console.log(`Wrote ${staff.length} staff records to data/staff.json.`);
