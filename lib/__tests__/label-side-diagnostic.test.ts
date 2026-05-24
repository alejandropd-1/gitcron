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

describe('Label Side Diagnostic - Full Repository', () => {
  it('prints ALL commits with lane, branchIndex, activeBranchIndices, and isLeft', () => {
    // 1. Get git log from Portfolio_2026_astro
    const logOutput = execSync(
      `git -C c:\\www\\Portfolio_2026_astro log --pretty=format:"%H|%ad|%an|%ae|%s|%P" --date=iso`,
      { encoding: 'utf8' }
    );

    // 2. Get refs
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
      return { hash, shortHash: hash.slice(0, 7), authorName, authorEmail, date, message, parents, refs };
    });

    const { rows } = computeGraph(commits);

    // Compute commitBranchNames
    const commitBranchNames = new Map<string, string>();
    const laneBranchNames: (string | null)[] = [];
    const commitIndex = new Map<string, number>();
    commits.forEach((c, idx) => commitIndex.set(c.hash, idx));
    const lanes2: (string | null)[] = [];

    const getBranchName = (commit: Commit) => {
      if (!commit.refs || commit.refs.length === 0) return null;
      const branchRefs = commit.refs.filter((r) => !r.startsWith('refs/tags/') && !r.includes('stash'));
      if (branchRefs.length === 0) return null;
      return branchRefs[0].replace(/^refs\/heads\//, '').replace(/^refs\/remotes\/[^/]+\//, '').replace(/^HEAD$/, '');
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const commit = row.commit;
      let lane = lanes2.indexOf(commit.hash);
      if (lane === -1) {
        lane = lanes2.findIndex((s) => s === null);
        if (lane === -1) lane = lanes2.length;
        lanes2[lane] = commit.hash;
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
      lanes2[lane] = null;
      const currentLaneBranchName = laneBranchNames[lane];
      laneBranchNames[lane] = null;
      for (let p = 0; p < commit.parents.length; p++) {
        const parent = commit.parents[p];
        const parentIdx = commitIndex.get(parent);
        if (parentIdx === undefined) continue;
        let parentLane = lanes2.indexOf(parent);
        if (parentLane === -1) {
          if (p === 0) {
            parentLane = lane;
            lanes2[parentLane] = parent;
            laneBranchNames[parentLane] = branchName || currentLaneBranchName;
          } else {
            parentLane = lanes2.findIndex((s) => s === null);
            if (parentLane === -1) parentLane = lanes2.length;
            lanes2[parentLane] = parent;
            laneBranchNames[parentLane] = null;
          }
        }
      }
    }

    // Compute branchRepresentativeIndices
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

    console.log('\n=== REPRESENTATIVE INDICES ===');
    branchRepresentativeIndices.forEach((index, name) => {
      console.log(`  ${name.padEnd(30)} => repIndex: ${index}`);
    });

    console.log('\n=== ALL COMMITS (chronological order: oldest first) ===');
    console.log('Row# | Hash    | Lane | bIdx | repIdx | ActiveBranchIndices        | isLeft | BranchName               | Message');
    console.log('-----|---------|------|------|--------|----------------------------|--------|--------------------------|--------');

    // Print in reverse (oldest first = most recent row index to least)
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      const branchName = commitBranchNames.get(row.commit.hash) || '';
      const branchIndex = mapLaneToBranchIndex(row.lane);

      let resolvedBranchIndex = branchIndex;
      if (resolvedBranchIndex === 0 && branchName && branchRepresentativeIndices.has(branchName)) {
        resolvedBranchIndex = branchRepresentativeIndices.get(branchName)!;
      }

      const activeLanes = [row.lane, ...row.activeLanes.map((al) => al.lane)];
      const activeBranchIndices = activeLanes.map(mapLaneToBranchIndex);
      const isLeft = labelSideFromBranchIndex(resolvedBranchIndex, activeBranchIndices) === 'left';

      // Highlight rows where activeBranchIndices has ONLY zeros (no lateral branches)
      const hasLateral = activeBranchIndices.some(x => x !== 0);
      const marker = !hasLateral ? ' *** ONLY-TRUNK ***' : '';

      console.log(
        `${i.toString().padStart(4)} | ${row.commit.shortHash} | ${row.lane.toString().padStart(4)} | ${branchIndex.toString().padStart(4)} | ${resolvedBranchIndex.toString().padStart(6)} | [${activeBranchIndices.join(', ').padEnd(24)}] | ${isLeft.toString().padEnd(6)} | ${branchName.padEnd(24)} | ${row.commit.message.slice(0, 40)}${marker}`
      );
    }

    // Summary statistics
    const totalCommits = rows.length;
    let leftCount = 0;
    let rightCount = 0;
    let onlyTrunkCount = 0;
    let onlyTrunkLeft = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const branchName = commitBranchNames.get(row.commit.hash) || '';
      const branchIndex = mapLaneToBranchIndex(row.lane);
      let resolvedBranchIndex = branchIndex;
      if (resolvedBranchIndex === 0 && branchName && branchRepresentativeIndices.has(branchName)) {
        resolvedBranchIndex = branchRepresentativeIndices.get(branchName)!;
      }
      const activeLanes = [row.lane, ...row.activeLanes.map((al) => al.lane)];
      const activeBranchIndices = activeLanes.map(mapLaneToBranchIndex);
      const isLeft = labelSideFromBranchIndex(resolvedBranchIndex, activeBranchIndices) === 'left';

      if (isLeft) leftCount++;
      else rightCount++;

      const hasLateral = activeBranchIndices.some(x => x !== 0);
      if (!hasLateral) {
        onlyTrunkCount++;
        if (isLeft) onlyTrunkLeft++;
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Total: ${totalCommits} | Left: ${leftCount} | Right: ${rightCount}`);
    console.log(`Only-Trunk (no lateral active branches): ${onlyTrunkCount} | Of those, Left: ${onlyTrunkLeft} | Right: ${onlyTrunkCount - onlyTrunkLeft}`);
    console.log(`Distribution: ${((leftCount / totalCommits) * 100).toFixed(1)}% left / ${((rightCount / totalCommits) * 100).toFixed(1)}% right`);
  });
});
