export interface ForceNode { x: number; y: number; vx: number; vy: number }

// Repulsion has a finite 180px radius. Only adjacent grid cells can interact.
// Dense clusters retain the original exact force; separated nodes avoid N² work.
export function applyLocalRepulsion(nodes: ForceNode[], radius = 180) {
  const cells = new Map<string, number[]>();
  for (let i = 0; i < nodes.length; i++) {
    const key = `${Math.floor(nodes[i].x / radius)},${Math.floor(nodes[i].y / radius)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(i);
    else cells.set(key, [i]);
  }
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const cx = Math.floor(node.x / radius), cy = Math.floor(node.y / radius);
    for (let x = cx - 1; x <= cx + 1; x++) {
      for (let y = cy - 1; y <= cy + 1; y++) {
        for (const j of cells.get(`${x},${y}`) ?? []) {
          if (j <= i) continue;
          const other = nodes[j];
          const dx = other.x - node.x, dy = other.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          if (distance >= radius) continue;
          const force = (radius - distance) / distance * 0.4;
          node.vx -= dx * force; node.vy -= dy * force;
          other.vx += dx * force; other.vy += dy * force;
        }
      }
    }
  }
}
