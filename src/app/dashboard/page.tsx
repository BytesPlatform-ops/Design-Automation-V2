'use client';

import { useEffect, useState } from 'react';
import { getProjectsByUser } from '@/lib/supabase-client';
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
                  className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors overflow-hidden group cursor-pointer"
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
