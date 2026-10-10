import { useReducedMotion } from '../../hooks/useReducedMotion';
import { applyLocalRepulsion } from '../../lib/graphLayout';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { api } from '../../api/client';
import { LoadingState } from '../ui/LoadingState';
import { cn } from '../../lib/utils';

export interface KnowledgeGraphCanvasProps {
  workspaceId: string;
  onSelectDoc: (id: string) => void;
}

function getGraphThemeColors() {
  if (typeof window === 'undefined') {
    return {
      docFill: 'oklch(0.72 0.15 262 / 0.18)',
      docFillHover: 'oklch(0.78 0.15 262)',
      docStroke: 'oklch(0.72 0.15 262)',
      projectFill: 'oklch(0.65 0.15 45 / 0.18)',
      projectFillHover: 'oklch(0.75 0.15 45)',
      projectStroke: 'oklch(0.65 0.15 45)',
      taskFill: 'oklch(0.8 0.1 145 / 0.18)',
      taskFillHover: 'oklch(0.85 0.1 145)',
      taskStroke: 'oklch(0.8 0.1 145)',
      edgeRef: 'oklch(0.72 0.15 262 / 0.45)',
      edgeNormal: 'oklch(1 0 0 / 0.12)',
      arrowRef: 'oklch(0.72 0.15 262)',
      labelPrimary: 'oklch(0.98 0.01 262)',
      labelMuted: 'oklch(0.66 0.02 262 / 0.55)',
      dimmedFill: 'rgba(100, 116, 139, 0.18)',
    };
  }
  const s = getComputedStyle(document.documentElement);
  return {
    docFill: s.getPropertyValue('--accent-subtle').trim() || 'oklch(0.72 0.15 262 / 0.18)',
    docFillHover: s.getPropertyValue('--accent-hover').trim() || 'oklch(0.78 0.15 262)',
    docStroke: s.getPropertyValue('--accent').trim() || 'oklch(0.72 0.15 262)',
    projectFill: s.getPropertyValue('--cat-projects-bg').trim() || 'oklch(0.65 0.15 45 / 0.18)',
    projectFillHover: s.getPropertyValue('--cat-projects').trim() || 'oklch(0.75 0.15 45)',
    projectStroke: s.getPropertyValue('--cat-projects').trim() || 'oklch(0.65 0.15 45)',
    taskFill: s.getPropertyValue('--success-bg').trim() || 'oklch(0.8 0.1 145 / 0.18)',
    taskFillHover: s.getPropertyValue('--success-fg').trim() || 'oklch(0.85 0.1 145)',
    taskStroke: s.getPropertyValue('--success-fg').trim() || 'oklch(0.8 0.1 145)',
    edgeRef: s.getPropertyValue('--accent-subtle').trim() || 'oklch(0.72 0.15 262 / 0.45)',
    edgeNormal: s.getPropertyValue('--border-default').trim() || 'oklch(1 0 0 / 0.12)',
    arrowRef: s.getPropertyValue('--accent').trim() || 'oklch(0.72 0.15 262)',
    labelPrimary: s.getPropertyValue('--text-primary').trim() || 'oklch(0.98 0.01 262)',
    labelMuted: s.getPropertyValue('--text-muted').trim() || 'oklch(0.66 0.02 262 / 0.55)',
    dimmedFill: 'rgba(100, 116, 139, 0.18)',
  };
}

export function KnowledgeGraphCanvas({
  workspaceId,
  onSelectDoc
}: KnowledgeGraphCanvasProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const effectiveWid = workspaceId || (typeof window !== 'undefined' ? localStorage.getItem('krama_active_workspace') : '') || '';
  const { data: graphData, isLoading } = useQuery({
    queryKey: ['workspace-graph', effectiveWid],
    queryFn: () => api.documents.getGraph(effectiveWid),
    enabled: !!effectiveWid
  });

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [graphView, setGraphView] = useState<'graph' | 'list'>('graph');
  const [listPage, setListPage] = useState(0);
  const reducedMotion = useReducedMotion();
  const dragMovedRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const links = useMemo(() => graphData?.links || [], [graphData]);
  const graphNodes = graphData?.nodes || [];
  const nodeLabels = useMemo(() => new Map((graphData?.nodes || []).map((node) => [node.id, node])), [graphData]);
  const adjacency = useMemo(() => {
    const result = new Map<string, { id: string; label: string }[]>();
    for (const link of links) {
      for (const [from, to, direction] of [[link.sourceId, link.targetId, 'Outgoing'], [link.targetId, link.sourceId, 'Incoming']]) {
        const values = result.get(from) || [];
        values.push({ id: to, label: `${direction} ${link.linkType.toLowerCase().replaceAll('_', ' ')}` });
        result.set(from, values);
      }
    }
    return result;
  }, [links]);
  const filteredNodes = graphNodes.filter((node: any) => (node.title || '').toLowerCase().includes(searchFilter.toLowerCase()));

  // Refs for smooth animation loop without thrashing on mouse movement
  const offsetRef = useRef(offset);
  const zoomRef = useRef(zoom);
  const hoveredNodeRef = useRef<any | null>(hoveredNode);
  const searchFilterRef = useRef(searchFilter);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    offsetRef.current = offset;
    zoomRef.current = zoom;
    hoveredNodeRef.current = hoveredNode;
    searchFilterRef.current = searchFilter;
  }, [offset, zoom, hoveredNode, searchFilter]);

  const animIdRef = useRef<number | null>(null);
  const simEngineRef = useRef<{ nodes: any[]; isSimulating: boolean }>({
    nodes: [],
    isSimulating: false,
  });
  const tickRef = useRef<() => void>(() => {});

  const wakeSimulation = useCallback(() => {
    if (!simEngineRef.current.isSimulating) {
      simEngineRef.current.isSimulating = true;
      animIdRef.current = requestAnimationFrame(() => tickRef.current());
    }
  }, []);

  // Initialize node layout
  useEffect(() => {
    if (!graphData?.nodes) return;
    const count = graphData.nodes.length;
    const radius = Math.max(160, count * 28);
    simEngineRef.current.nodes = graphData.nodes.map((node: any, i: number) => {
      const angle = (i / count) * 2 * Math.PI;
      return {
        ...node,
        x: Math.cos(angle) * radius + (Math.random() * 40 - 20),
        y: Math.sin(angle) * radius + (Math.random() * 40 - 20),
        vx: 0,
        vy: 0,
        radius: 24
      };
    });
    wakeSimulation();
  }, [graphData, wakeSimulation]);

  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      simEngineRef.current.isSimulating = false;
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      simEngineRef.current.isSimulating = false;
      return;
    }

    const nodes = simEngineRef.current.nodes;
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const colors = getGraphThemeColors();
    let totalKineticEnergy = 0;
    if (!reducedMotion && graphView === 'graph') {
      applyLocalRepulsion(nodes);

      // Spring attraction for links
      for (const link of links) {
        const source = nodeById.get(link.sourceId);
        const target = nodeById.get(link.targetId);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 120) * 0.005;
          source.vx += dx * force;
          source.vy += dy * force;
          target.vx -= dx * force;
          target.vy -= dy * force;
        }
      }

      // Center gravity & velocity dampening
      for (const node of nodes) {
        node.vx -= node.x * 0.002;
        node.vy -= node.y * 0.002;
        node.vx *= 0.88;
        node.vy *= 0.88;
        node.x += node.vx;
        node.y += node.vy;
        totalKineticEnergy += Math.abs(node.vx) + Math.abs(node.vy);
      }

    }

    // Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2 + offsetRef.current.x, canvas.height / 2 + offsetRef.current.y);
    ctx.scale(zoomRef.current, zoomRef.current);

    // Draw links
    for (const link of links) {
      const source = nodeById.get(link.sourceId);
      const target = nodeById.get(link.targetId);
      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = link.linkType === 'REFERENCE' ? colors.edgeRef : colors.edgeNormal;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw small arrow head
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const arrowDist = 28;
        const arrowX = target.x - Math.cos(angle) * arrowDist;
        const arrowY = target.y - Math.sin(angle) * arrowDist;
        ctx.beginPath();
        ctx.arc(arrowX, arrowY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = colors.arrowRef;
        ctx.fill();
      }
    }

    // Draw nodes with multi-entity shapes (DOCUMENT: circle, PROJECT: hexagon/rect, TASK: square)
    for (const node of nodes) {
      const isMatch = !searchFilterRef.current || (node.title || '').toLowerCase().includes(searchFilterRef.current.toLowerCase());
      const isHover = hoveredNodeRef.current?.id === node.id;
      const nodeType = node.type || 'DOCUMENT';

      ctx.save();
      if (nodeType === 'PROJECT') {
        // Rounded Hexagon/Box for PROJECT
        const w = node.radius * 2;
        const h = node.radius * 1.5;
        ctx.beginPath();
        if ((ctx as any).roundRect) {
          (ctx as any).roundRect(node.x - w / 2, node.y - h / 2, w, h, 8);
        } else {
          ctx.rect(node.x - w / 2, node.y - h / 2, w, h);
        }
        ctx.fillStyle = isHover ? colors.projectFillHover : isMatch ? colors.projectFill : colors.dimmedFill;
        ctx.fill();
        ctx.strokeStyle = colors.projectStroke;
        ctx.lineWidth = isHover ? 3 : 1.5;
        ctx.stroke();
      } else if (nodeType === 'TASK') {
        // Rounded Square for TASK
        const size = node.radius * 1.6;
        ctx.beginPath();
        if ((ctx as any).roundRect) {
          (ctx as any).roundRect(node.x - size / 2, node.y - size / 2, size, size, 6);
        } else {
          ctx.rect(node.x - size / 2, node.y - size / 2, size, size);
        }
        ctx.fillStyle = isHover ? colors.taskFillHover : isMatch ? colors.taskFill : colors.dimmedFill;
        ctx.fill();
        ctx.strokeStyle = colors.taskStroke;
        ctx.lineWidth = isHover ? 3 : 1.5;
        ctx.stroke();
      } else {
        // Circle for DOCUMENT
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.fillStyle = isHover ? colors.docFillHover : isMatch ? colors.docFill : colors.dimmedFill;
        ctx.fill();
        ctx.strokeStyle = colors.docStroke;
        ctx.lineWidth = isHover ? 3 : 1.5;
        ctx.stroke();
      }
      ctx.restore();

      // Node Label
      ctx.font = '600 12px Inter, sans-serif';
      ctx.fillStyle = isMatch ? colors.labelPrimary : colors.labelMuted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(node.title || 'Untitled', node.x, node.y + node.radius + 6);
    }

    ctx.restore();

    // Alpha decay: continue loop only while energy exists or while dragging
    if (!reducedMotion && graphView === 'graph' && !document.hidden && (totalKineticEnergy > 0.05 || isDraggingRef.current)) {
      animIdRef.current = requestAnimationFrame(() => tickRef.current());
    } else {
      simEngineRef.current.isSimulating = false;
      animIdRef.current = null;
    }
  }, [links, reducedMotion, graphView]);

  useEffect(() => {
    tickRef.current = tick;
  });

  // Start simulation loop on graph data
  useEffect(() => {
    const engine = simEngineRef.current;
    wakeSimulation();
    return () => {
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current);
        animIdRef.current = null;
      }
      engine.isSimulating = false;
    };
  }, [graphData, reducedMotion, graphView, wakeSimulation]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        wakeSimulation();
      }
    };
    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (canvasRef.current) observer.observe(canvasRef.current);
    const themeObserver = new MutationObserver(wakeSimulation);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const onVisibility = () => { if (!document.hidden) wakeSimulation(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [wakeSimulation, isLoading, graphView]);

  const handleMouseDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragMovedRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y };
    wakeSimulation();
  };

  const handleMouseMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      if (Math.hypot(e.clientX - pointerStartRef.current.x, e.clientY - pointerStartRef.current.y) > 5) dragMovedRef.current = true;
      offsetRef.current = {
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      };
      wakeSimulation();
    }

    // Check hit node
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - canvas.width / 2 - offsetRef.current.x) / zoomRef.current;
    const mouseY = (e.clientY - rect.top - canvas.height / 2 - offsetRef.current.y) / zoomRef.current;

    const hit = simEngineRef.current.nodes.find(n => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius;
    });

    const newHit = hit || null;
    if (hoveredNodeRef.current?.id !== newHit?.id) {
      hoveredNodeRef.current = newHit;
      setHoveredNode(newHit);
      wakeSimulation();
    }
  };

  const openNode = (node: any) => {
    if (node.type === 'PROJECT') navigate(`/app/projects/${node.id}`);
    else if (node.type === 'TASK') navigate('/app/board');
    else onSelectDoc(node.id);
  };

  const handleMouseUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setOffset({ ...offsetRef.current });
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!dragMovedRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left - e.currentTarget.width / 2 - offsetRef.current.x) / zoomRef.current;
      const y = (e.clientY - rect.top - e.currentTarget.height / 2 - offsetRef.current.y) / zoomRef.current;
      const hit = simEngineRef.current.nodes.find(n => Math.hypot(n.x - x, n.y - y) <= n.radius);
      if (hit) openNode(hit);
    }
    wakeSimulation();
  };

  if (isLoading) return <LoadingState title="Loading Knowledge Graph..." description="Synthesizing document topology..." />;

  const nodesCount = graphData?.nodes?.length || 0;
  const linksCount = graphData?.links?.length || 0;

  return (
    <div className="flex-1 h-full w-full relative bg-canvas overflow-hidden flex flex-col font-sans select-none">
      {/* Top Floating Controls Bar */}
      <div className="relative z-10 flex flex-wrap items-center gap-2 justify-between p-3 shrink-0">
        <div className="flex items-center gap-2 pointer-events-auto bg-surface/90 backdrop-blur-md p-1.5 rounded-xl border border-border shadow-md">
          <Search className="w-4 h-4 text-muted ml-2" />
          <input
            type="text"
            value={searchFilter}
            aria-label="Filter graph nodes"
            onChange={(e) => { setSearchFilter(e.target.value); setListPage(0); wakeSimulation(); }}
            placeholder="Filter nodes..."
            className="bg-transparent border-none outline-none text-primary text-caption font-mono w-40 placeholder:text-muted pr-2"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-surface p-1.5 rounded-xl border border-border text-caption font-mono text-secondary">
          <span className="px-2 font-bold">{nodesCount} Nodes • {linksCount} Links</span>
          <button aria-label="Zoom in" onClick={() => { setZoom(z => Math.min(2.5, z + 0.2)); wakeSimulation(); }} className="h-11 w-11 flex items-center justify-center rounded hover:bg-surface-hover text-primary">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button aria-label="Zoom out" onClick={() => { setZoom(z => Math.max(0.4, z - 0.2)); wakeSimulation(); }} className="h-11 w-11 flex items-center justify-center rounded hover:bg-surface-hover text-primary">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button aria-label="Reset graph view" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); offsetRef.current = { x: 0, y: 0 }; wakeSimulation(); }} className="h-11 w-11 flex items-center justify-center rounded hover:bg-surface-hover text-primary">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-3 pb-2 shrink-0" role="group" aria-label="Graph display">
        <button className="min-h-11 px-3 rounded-lg border border-border text-caption aria-pressed:bg-accent-subtle aria-pressed:text-accent-fg aria-pressed:border-accent" aria-pressed={graphView === 'graph'} onClick={() => setGraphView('graph')}>Graph</button>
        <button className="min-h-11 px-3 rounded-lg border border-border text-caption aria-pressed:bg-accent-subtle aria-pressed:text-accent-fg aria-pressed:border-accent" aria-pressed={graphView === 'list'} onClick={() => setGraphView('list')}>Nodes and links</button>
        <span className="self-center text-caption text-secondary">Use Nodes and links to browse all relationships with a keyboard.</span>
      </div>
      {graphView === 'list' && <section aria-label="Graph nodes and relationships" className="flex-1 min-h-0 overflow-auto p-3">
        {filteredNodes.length === 0 && <p>No nodes match your search.</p>}
        <ul className="divide-y divide-border">
          {filteredNodes.slice(listPage * 50, (listPage + 1) * 50).map((node: any) => <li key={node.id} className="py-3">
            <button className="min-h-11 text-left break-words text-body text-accent-fg" onClick={() => openNode(node)}>{node.title || 'Untitled'} <span className="text-caption text-secondary">({node.type || 'DOCUMENT'})</span></button>
            <ul className="pl-4 text-caption text-secondary">
              {(adjacency.get(node.id) || []).map((link, index) => <li key={`${link.id}-${index}`}>
                {link.label}: <button className="min-h-11 text-left text-accent-fg break-words" onClick={() => { const target = nodeLabels.get(link.id); if (target) openNode(target); }}>{nodeLabels.get(link.id)?.title || 'Untitled'}</button>
              </li>)}
              {!adjacency.get(node.id)?.length && <li>No connections</li>}
            </ul>
          </li>)}
        </ul>
        <div className="flex gap-3 items-center mt-3">
          <button className="min-h-11 px-3 border border-border rounded-lg disabled:opacity-50" disabled={listPage === 0} onClick={() => setListPage(p => p - 1)}>Previous</button>
          <span className="text-caption">Page {listPage + 1} of {Math.max(1, Math.ceil(filteredNodes.length / 50))}</span>
          <button className="min-h-11 px-3 border border-border rounded-lg disabled:opacity-50" disabled={(listPage + 1) * 50 >= filteredNodes.length} onClick={() => setListPage(p => p + 1)}>Next</button>
        </div>
      </section>}
      <canvas
        role="img"
        aria-label="Knowledge graph. Use Nodes and links for keyboard navigation and relationship details."
        ref={canvasRef}
        onPointerDown={handleMouseDown}
        onPointerMove={handleMouseMove}
        onPointerUp={handleMouseUp}
        onPointerCancel={() => { isDraggingRef.current = false; }}
        className={cn("flex-1 min-h-0 cursor-grab active:cursor-grabbing w-full touch-none", graphView === "list" && "hidden", hoveredNode && "cursor-pointer")}
      />
    </div>
  );
}
