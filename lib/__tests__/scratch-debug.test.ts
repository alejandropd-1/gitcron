import { describe, it } from 'vitest';
import { execSync } from 'child_process';
import { mapLaneToBranchIndex, labelSideFromBranchIndex } from '../chronometric-projection';

const BRANCH_PALETTE = [
  '#5ed8ff', '#fd9d1a', '#ff716c', '#39bce2', '#ffb462', '#d0bcff',
  '#68b24f', '#f472b6', '#a78bfa', '#34d399', '#fb923c', '#60a5fa'
];

interface Commit {
  hash: string;
  shortHash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
  parents: string[];
  refs: string[];
}

interface GraphRow {
  commit: Commit;
  lane: number;
  laneColor: string;
  connections: Array<{ fromLane: number; toLane: number; toRow: number; color: string }>;
  activeLanes: Array<{ lane: number; color: string }>;
}

function computeGraph(commits: Commit[]): { rows: GraphRow[]; totalLanes: number } {
  const lanes: (string | null)[] = [];
  const laneColors: string[] = [];
  const commitIndex = new Map<string, number>();
  commits.forEach((c, i) => commitIndex.set(c.hash, i));

  const rows: GraphRow[] = [];
  let nextFallbackIdx = 0;

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];

    let lane = lanes.indexOf(commit.hash);
    let laneColor: string;

    if (lane === -1) {
      lane = lanes.findIndex((s) => s === null);
      if (lane === -1) lane = lanes.length;
      laneColor = BRANCH_PALETTE[nextFallbackIdx++ % BRANCH_PALETTE.length];
      lanes[lane] = commit.hash;
      laneColors[lane] = laneColor;
    } else {
      laneColor = laneColors[lane];
    }

    const activeLanes = lanes
      .map((sha, l) => (sha !== null && sha !== commit.hash ? { lane: l, color: laneColors[l] } : null))
      .filter((x): x is { lane: number; color: string } => x !== null);

    lanes[lane] = null;

    const connections: GraphRow['connections'] = [];
    for (let p = 0; p < commit.parents.length; p++) {
      const parent = commit.parents[p];
      const parentIdx = commitIndex.get(parent);
      if (parentIdx === undefined) continue;

      let parentLane = lanes.indexOf(parent);
      if (parentLane === -1) {
        if (p === 0) {
          parentLane = lane;
          lanes[parentLane] = parent;
          laneColors[parentLane] = laneColor;
        } else {
          parentLane = lanes.findIndex((s) => s === null);
          if (parentLane === -1) parentLane = lanes.length;
          lanes[parentLane] = parent;
          laneColors[parentLane] = BRANCH_PALETTE[nextFallbackIdx++ % BRANCH_PALETTE.length];
        }
      }

      connections.push({ fromLane: lane, toLane: parentLane, toRow: parentIdx, color: laneColors[parentLane] });
    }

    rows.push({ commit, lane, laneColor, connections, activeLanes });
  }

  const totalLanes = Math.max(
    ...rows.map((r) =>
      Math.max(r.lane, ...r.connections.map((c) => Math.max(c.fromLane, c.toLane))) + 1
    ),
    1
  );

  return { rows, totalLanes };
}

describe('debug Portfolio_2026_astro TVisualEditor', () => {
  it('prints commit details for TVisualEditor', () => {
    // 1. Get git log from Portfolio_2026_astro
    const logOutput = execSync(
      `git -C c:\\www\\Portfolio_2026_astro log --pretty=format:"%H|%ad|%an|%ae|%s|%P" --date=iso`,
      { encoding: 'utf8' }
    );

    // 2. Get refs from Portfolio_2026_astro
    const refsOutput = execSync(
      `git -C c:\\www\\Portfolio_2026_astro for-each-ref --format="%(objectname) %(refname)"`,
      { encoding: 'utf8' }
    );

    const refMap = new Map<string, string[]>();
    refsOutput.split('\n').filter(Boolean).forEach((line) => {
      const [sha, ref] = line.split(' ');
      if (!refMap.has(sha)) refMap.set(sha, []);
      refMap.get(sha)!.push(ref);
    });

    const commits = logOutput.split('\n').filter(Boolean).map((line) => {
      const [hash, date, authorName, authorEmail, message, parentsStr] = line.split('|');
      const parents = parentsStr ? parentsStr.split(' ').filter(Boolean) : [];
      const refs = refMap.get(hash) || [];
      return {
        hash,
        shortHash: hash.slice(0, 7),
        authorName,
        authorEmail,
        date,
        message,
        parents,
        refs,
      };
    });

    // 3. Compute classic graph lanes
    const { rows } = computeGraph(commits);

    // 4. Compute commitBranchNames
    const commitBranchNames = new Map<string, string>();
    const laneBranchNames: (string | null)[] = [];
    const commitIndex = new Map<string, number>();
    commits.forEach((c, idx) => commitIndex.set(c.hash, idx));

    const lanes: (string | null)[] = [];

    const getBranchName = (commit: Commit) => {
      if (!commit.refs || commit.refs.length === 0) return null;
      const branchRefs = commit.refs.filter(
        (r) => !r.startsWith('refs/tags/') && !r.includes('stash')
      );
      if (branchRefs.length === 0) return null;
      return branchRefs[0]
        .replace(/^refs\/heads\//, '')
        .replace(/^refs\/remotes\/[^/]+\//, '')
        .replace(/^HEAD$/, '');
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const commit = row.commit;

      let lane = lanes.indexOf(commit.hash);
      if (lane === -1) {
        lane = lanes.findIndex((s) => s === null);
        if (lane === -1) lane = lanes.length;
        lanes[lane] = commit.hash;
      }

      let branchName = getBranchName(commit);
      if (branchName) {
        laneBranchNames[lane] = branchName;
      } else {
        branchName = laneBranchNames[lane] || null;
      }

      if (branchName) {
        commitBranchNames.set(commit.hash, branchName);
      }

      lanes[lane] = null;
      const currentLaneBranchName = laneBranchNames[lane];
      laneBranchNames[lane] = null;

      for (let p = 0; p < commit.parents.length; p++) {
        const parent = commit.parents[p];
        const parentIdx = commitIndex.get(parent);
        if (parentIdx === undefined) continue;

        let parentLane = lanes.indexOf(parent);
        if (parentLane === -1) {
          if (p === 0) {
            parentLane = lane;
            lanes[parentLane] = parent;
            laneBranchNames[parentLane] = branchName || currentLaneBranchName;
          } else {
            parentLane = lanes.findIndex((s) => s === null);
            if (parentLane === -1) parentLane = lanes.length;
            lanes[parentLane] = parent;
            laneBranchNames[parentLane] = null;
          }
        }
      }
    }

    // 5. Compute branchRepresentativeIndices
    const branchRepresentativeIndices = new Map<string, number>();
    rows.forEach((row) => {
      const branchName = commitBranchNames.get(row.commit.hash);
      if (branchName && branchName !== 'main' && branchName !== 'master') {
        const bIndex = mapLaneToBranchIndex(row.lane);
        if (bIndex !== 0 && !branchRepresentativeIndices.has(branchName)) {
          branchRepresentativeIndices.set(branchName, bIndex);
        }
      }
    });

    console.log('--- REPRESENTATIVE INDICES ---');
    branchRepresentativeIndices.forEach((index, name) => {
      console.log(`BranchName: ${name} | RepresentativeIndex: ${index}`);
    });

    console.log('--- BackgroundBlur COMMITS DETAILS ---');
    rows.forEach((row) => {
      const branchName = commitBranchNames.get(row.commit.hash) || 'null';
      if (
        branchName.toLowerCase().includes('backgroundblur') ||
        row.commit.message.toLowerCase().includes('background') ||
        row.commit.message.toLowerCase().includes('blur')
      ) {
        const branchIndex = mapLaneToBranchIndex(row.lane);
        let repIndex = branchIndex;
        if (repIndex === 0 && branchName && branchRepresentativeIndices.has(branchName)) {
          repIndex = branchRepresentativeIndices.get(branchName)!;
        }

        const activeLanes = [row.lane, ...row.activeLanes.map((al) => al.lane)];
        const activeBranchIndices = activeLanes.map(mapLaneToBranchIndex);
        const isLeft = labelSideFromBranchIndex(repIndex, activeBranchIndices) === 'left';

        console.log(
          `Hash: ${row.commit.shortHash} | Msg: ${row.commit.message.slice(0, 30).padEnd(30)} | Lane: ${row.lane} | BranchName: ${branchName.padEnd(20)} | repIndex: ${repIndex.toString().padStart(2)} | isLeft: ${isLeft}`
        );
      }
    });
  });
});
