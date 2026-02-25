'use client';

import { useEffect, useState } from 'react';
import { getProjectsByUser, deleteProject } from '@/lib/supabase-client';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Project {
  id: string;
  business_name: string;
  industry: string;
  niche: string;
  created_at: string;
  campaigns?: Array<{
    id: string;
    name: string;
    generated_images?: Array<{
      id: string;
      image_url: string;
    }>;
  }>;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(`Delete "${projectName}" and all its ads? This cannot be undone.`)) return;
    
    try {
      setDeletingId(projectId);
      await deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err: any) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project: ' + (err?.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        // Using temp user ID - same as generation API
        const tempUserId = 'temp-user-' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 8);
        console.log('📦 Loading projects for user:', tempUserId);
        console.log('🔍 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        
        const data = await getProjectsByUser(tempUserId);
        console.log('✅ Projects loaded:', data);
        setProjects(data || []);
      } catch (err: any) {
        const errorMsg = err?.message || err?.error_description || JSON.stringify(err) || 'Failed to load projects';
        console.error('❌ Error loading projects:', errorMsg);
        console.error('Full error:', err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4">My Projects</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="bg-slate-800 border-slate-700 animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-32 bg-slate-700 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4">My Projects</h1>
          <Card className="bg-red-900/20 border-red-500">
            <CardContent className="pt-6">
              <p className="text-red-200">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">My Projects</h1>
            <p className="text-slate-400 mt-2">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} saved
            </p>
          </div>
          <Link href="/create">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Create New Campaign
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-slate-400 mb-6">No projects yet. Create your first ad campaign!</p>
              <Link href="/create">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Start Creating
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const totalImages = project.campaigns?.reduce(
                (sum, campaign) => sum + (campaign.generated_images?.length || 0),
                0
              ) || 0;

              const imageUrl = project.campaigns?.[0]?.generated_images?.[0]?.image_url;

              return (
                <Card 
                  key={project.id} 
                  className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors overflow-hidden group cursor-pointer relative"
                >
                  {imageUrl && (
                    <div className="relative h-32 overflow-hidden bg-slate-700">
                      <img
                        src={imageUrl}
                        alt={project.business_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDeleteProject(e, project.id, project.business_name)}
                    disabled={deletingId === project.id}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-red-600 text-slate-300 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100 z-10 disabled:opacity-50"
                    title="Delete project"
                  >
                    {deletingId === project.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                  <CardHeader>
                    <CardTitle className="text-white">{project.business_name}</CardTitle>
                    <CardDescription>
                      <span className="inline-block bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs mr-2">
                        {project.industry}
                      </span>
                      {project.niche && (
                        <span className="inline-block bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs">
                          {project.niche}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-slate-400">
                        Created: {new Date(project.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-400">
                        {totalImages} ad{totalImages !== 1 ? 's' : ''} generated
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      asChild
                    >
                      <Link href={`/project/${project.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
