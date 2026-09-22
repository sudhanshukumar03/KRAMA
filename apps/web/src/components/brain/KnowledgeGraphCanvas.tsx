import React, { useState, useRef, useEffect, useCallback } from 'react';
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

  // Refs for smooth animation loop without thrashing on mouse movement
  const offsetRef = useRef({ x: 0, y: 0 });
  offsetRef.current = offset;
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const hoveredNodeRef = useRef<any | null>(null);
  hoveredNodeRef.current = hoveredNode;
  const searchFilterRef = useRef('');
  searchFilterRef.current = searchFilter;
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const isSimulatingRef = useRef(false);
  const animIdRef = useRef<number | null>(null);
  const nodesRef = useRef<any[]>([]);
  const tickRef = useRef<() => void>(() => {});

  const wakeSimulation = useCallback(() => {
    if (!isSimulatingRef.current) {
      isSimulatingRef.current = true;
      animIdRef.current = requestAnimationFrame(() => tickRef.current());
    }
  }, []);

  // Initialize node layout
  useEffect(() => {
    if (!graphData?.nodes) return;
    const count = graphData.nodes.length;
    const radius = Math.max(160, count * 28);
    nodesRef.current = graphData.nodes.map((node: any, i: number) => {
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

  const tick = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      isSimulatingRef.current = false;
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      isSimulatingRef.current = false;
      return;
    }

    const nodes = nodesRef.current;
    const rawLinks = graphData?.links || (graphData as any)?.edges || [];
    const links = rawLinks.map((l: any) => ({
      sourceId: l.sourceId || l.source,
      targetId: l.targetId || l.target,
      linkType: l.linkType || l.type || 'REFERENCE'
    }));

    // Simple repulsion between nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 180) {
          const force = (180 - dist) / dist * 0.4;
          nodes[i].vx -= dx * force;
          nodes[i].vy -= dy * force;
          nodes[j].vx += dx * force;
          nodes[j].vy += dy * force;
        }
      }
    }

    // Spring attraction for links
    for (const link of links) {
      const source = nodes.find(n => n.id === link.sourceId);
      const target = nodes.find(n => n.id === link.targetId);
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
    let totalKineticEnergy = 0;
    for (const node of nodes) {
      node.vx -= node.x * 0.002;
      node.vy -= node.y * 0.002;
      node.vx *= 0.88;
      node.vy *= 0.88;
      node.x += node.vx;
      node.y += node.vy;
      totalKineticEnergy += Math.abs(node.vx) + Math.abs(node.vy);
    }

    // Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2 + offsetRef.current.x, canvas.height / 2 + offsetRef.current.y);
    ctx.scale(zoomRef.current, zoomRef.current);

    // Draw links
    for (const link of links) {
      const source = nodes.find(n => n.id === link.sourceId);
      const target = nodes.find(n => n.id === link.targetId);
      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = link.linkType === 'REFERENCE' ? 'rgba(37, 99, 235, 0.45)' : 'rgba(156, 163, 175, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw small arrow head
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const arrowDist = 28;
        const arrowX = target.x - Math.cos(angle) * arrowDist;
        const arrowY = target.y - Math.sin(angle) * arrowDist;
        ctx.beginPath();
        ctx.arc(arrowX, arrowY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#2563EB';
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
        ctx.fillStyle = isHover ? '#7C3AED' : isMatch ? '#2E1065' : 'rgba(100, 116, 139, 0.3)';
        ctx.fill();
        ctx.strokeStyle = isHover ? '#C084FC' : '#9333EA';
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
        ctx.fillStyle = isHover ? '#D97706' : isMatch ? '#451A03' : 'rgba(100, 116, 139, 0.3)';
        ctx.fill();
        ctx.strokeStyle = isHover ? '#FCD34D' : '#F59E0B';
        ctx.lineWidth = isHover ? 3 : 1.5;
        ctx.stroke();
      } else {
        // Circle for DOCUMENT
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.fillStyle = isHover ? '#2563EB' : isMatch ? '#1E293B' : 'rgba(100, 116, 139, 0.3)';
        ctx.fill();
        ctx.strokeStyle = isHover ? '#60A5FA' : '#3B82F6';
        ctx.lineWidth = isHover ? 3 : 1.5;
        ctx.stroke();
      }
      ctx.restore();

      // Node Label
      ctx.font = '600 12px Inter, sans-serif';
      ctx.fillStyle = isMatch ? '#F8FAFC' : 'rgba(156, 163, 175, 0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(node.title || 'Untitled', node.x, node.y + node.radius + 6);
    }

    ctx.restore();

    // Alpha decay: continue loop only while energy exists or while dragging
    if (totalKineticEnergy > 0.05 || isDraggingRef.current) {
      animIdRef.current = requestAnimationFrame(() => tickRef.current());
    } else {
      isSimulatingRef.current = false;
      animIdRef.current = null;
    }
  };
  tickRef.current = tick;

  // Start simulation loop on graph data
  useEffect(() => {
    wakeSimulation();
    return () => {
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current);
        animIdRef.current = null;
      }
      isSimulatingRef.current = false;
    };
  }, [graphData, wakeSimulation]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        wakeSimulation();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [wakeSimulation]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y };
    wakeSimulation();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
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

    const hit = nodesRef.current.find(n => {
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

  const handleMouseUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setOffset({ ...offsetRef.current });
    }
  };

  const handleClick = () => {
    if (hoveredNode) {
      if (hoveredNode.type === 'PROJECT') {
        navigate(`/app/projects/${hoveredNode.id}`);
      } else if (hoveredNode.type === 'TASK') {
        navigate('/app/board');
      } else {
        onSelectDoc(hoveredNode.id);
      }
    }
  };

  if (isLoading) return <LoadingState title="Loading Knowledge Graph..." description="Synthesizing document topology..." />;

  const nodesCount = graphData?.nodes?.length || 0;
  const linksCount = graphData?.links?.length || 0;

  return (
    <div className="flex-1 h-full w-full relative bg-canvas overflow-hidden flex flex-col font-sans select-none">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-surface/90 backdrop-blur-md p-1.5 rounded-xl border border-border shadow-md">
          <Search className="w-4 h-4 text-muted ml-2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter nodes..."
            className="bg-transparent border-none outline-none text-primary text-caption font-mono w-40 placeholder:text-muted pr-2"
          />
        </div>

        <div className="flex items-center gap-2 pointer-events-auto bg-surface/90 backdrop-blur-md p-1.5 rounded-xl border border-border shadow-md text-caption font-mono text-secondary">
          <span className="px-2 font-bold">{nodesCount} Nodes • {linksCount} Links</span>
          <button onClick={() => { setZoom(z => Math.min(2.5, z + 0.2)); wakeSimulation(); }} className="p-1.5 rounded hover:bg-surface-hover text-primary">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => { setZoom(z => Math.max(0.4, z - 0.2)); wakeSimulation(); }} className="p-1.5 rounded hover:bg-surface-hover text-primary">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); offsetRef.current = { x: 0, y: 0 }; wakeSimulation(); }} className="p-1.5 rounded hover:bg-surface-hover text-primary">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        className={cn("flex-1 cursor-grab active:cursor-grabbing w-full h-full", hoveredNode && "cursor-pointer")}
      />
    </div>
  );
}
