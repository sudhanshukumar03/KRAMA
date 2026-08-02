import { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { api } from '../api/client';
import { Network } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from './ui/EmptyState';

interface GraphData {
  nodes: { id: string; label: string; type: string; status?: string }[];
  links: { source: string; target: string; type: string }[];
}

export function KnowledgeGraph() {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const graphRef = useRef<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const response = await api.knowledgeGraph.get();
        setData({ nodes: response.nodes || [], links: response.edges || [] });
      } catch (err: any) {
        setError(err.message || 'Failed to load Knowledge Graph');
      } finally {
        setIsLoading(false);
      }
    };
    fetchGraph();
  }, []);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'goal': return '#10B981'; // Green
      case 'project': return '#3B82F6'; // Blue
      case 'task': return '#F97316'; // Orange
      case 'page': return '#8B5CF6'; // Purple
      case 'habit': return '#14B8A6'; // Teal
      default: return '#9CA3AF'; // Gray
    }
  };

  const handleNodeClick = useCallback((node: any) => {
    switch (node.type) {
      case 'goal': navigate('/app/goals'); break;
      case 'project': navigate(`/app/projects/${node.id}`); break;
      case 'task': navigate('/app/board'); break;
      case 'page': navigate('/app/brain'); break;
      case 'habit': navigate('/app/habits'); break;
      default: break;
    }
  }, [navigate]);

  if (isLoading) return <div className="p-8 flex justify-center text-muted">Loading graph...</div>;
  if (error) return <div className="p-8 text-danger">{error}</div>;

  if (data.nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-canvas">
        <EmptyState 
          icon={Network}
          title="No Knowledge Graph Data"
          description="Create projects, tasks, habits, and notes to see how they connect."
          actionLabel="Go to Dashboard"
          onAction={() => navigate('/app/dashboard')}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-canvas relative">
      <div className="p-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
            <div className="v4-icon-chip v4-icon-chip-purple">
              <Network className="w-5 h-5" />
            </div>
            Knowledge Graph
          </h1>
          <p className="text-muted mt-1 text-sm">Visualizing {data.nodes.length} entities and {data.links.length} relationships.</p>
        </div>
      </div>
      <div className="flex-1 relative border-t border-border bg-card">
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          nodeLabel="label"
          nodeColor={(node: any) => getNodeColor(node.type)}
          nodeRelSize={6}
          linkColor={() => '#E5E7EB'}
          onNodeClick={handleNodeClick}
          cooldownTicks={100}
        />
      </div>
    </div>
  );
}
