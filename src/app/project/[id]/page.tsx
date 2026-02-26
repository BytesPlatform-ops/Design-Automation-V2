'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProjectDetails, deleteGeneratedImage } from '@/lib/supabase-client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface GeneratedImage {
  id: string;
  concept_id: string;
  image_url: string;
  prompt: string;
  aspect_ratio: string;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  product_name: string;
  product_description: string;
  target_audience: string;
  created_at: string;
  generated_images: GeneratedImage[];
}

interface ProjectDetail {
  id: string;
  user_id: string;
  business_name: string;
  industry: string;
  niche: string;
  created_at: string;
  campaigns: Campaign[];
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  const handleDeleteImage = async (e: React.MouseEvent, imageId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Delete this ad? This cannot be undone.')) return;

    try {
      setDeletingImageId(imageId);
      await deleteGeneratedImage(imageId);
      
      // Remove from local state
      if (selectedImage?.id === imageId) setSelectedImage(null);
      setProject(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          campaigns: prev.campaigns.map(c => ({
            ...c,
            generated_images: c.generated_images.filter(img => img.id !== imageId)
          }))
        };
      });
    } catch (err: any) {
      console.error('Failed to delete image:', err);
      alert('Failed to delete: ' + (err?.message || 'Unknown error'));
    } finally {
      setDeletingImageId(null);
    }
  };

  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        const data = await getProjectDetails(projectId);
        setProject(data as ProjectDetail);
      } catch (err: any) {
        console.error('Failed to load project:', err);
        setError(err?.message || 'Failed to load project details');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-700 rounded w-1/3"></div>
            <div className="h-6 bg-slate-700 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 bg-slate-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Project Not Found</h1>
          <p className="text-slate-400 mb-6">{error || 'This project does not exist.'}</p>
          <Link href="/dashboard">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const allImages = project.campaigns?.flatMap(c => c.generated_images || []) || [];
  const totalImages = allImages.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white">{project.business_name}</h1>
              <div className="flex items-center gap-3 mt-3">
                <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border-blue-600/30">
                  {project.industry}
                </Badge>
                {project.niche && (
                  <Badge variant="secondary" className="bg-purple-600/20 text-purple-300 border-purple-600/30">
                    {project.niche.length > 50 ? project.niche.substring(0, 50) + '...' : project.niche}
                  </Badge>
                )}
              </div>
              <p className="text-slate-400 mt-2 text-sm">
                Created {new Date(project.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {' · '}
                {totalImages} ad{totalImages !== 1 ? 's' : ''} generated
                {' · '}
                {project.campaigns?.length || 0} campaign{(project.campaigns?.length || 0) !== 1 ? 's' : ''}
              </p>
            </div>
            <Link href="/create">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Create New Ad
              </Button>
            </Link>
          </div>
        </div>

        {/* Campaigns */}
        {project.campaigns && project.campaigns.length > 0 ? (
          <div className="space-y-8">
            {project.campaigns.map((campaign, campaignIndex) => (
              <div key={campaign.id}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-semibold text-white">
                    Campaign {campaignIndex + 1}: {campaign.name || 'Untitled Campaign'}
                  </h2>
                  <Badge variant="outline" className="text-slate-400 border-slate-600">
                    {campaign.generated_images?.length || 0} ad{(campaign.generated_images?.length || 0) !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {campaign.product_name && (
                  <p className="text-slate-400 text-sm mb-4">
                    Product: {campaign.product_name}
                    {campaign.target_audience && ` · Audience: ${campaign.target_audience}`}
                  </p>
                )}

                {/* Image Grid */}
                {campaign.generated_images && campaign.generated_images.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaign.generated_images.map((image) => (
                      <Card 
                        key={image.id} 
                        className="bg-slate-800 border-slate-700 hover:border-blue-500/50 transition-all duration-300 overflow-hidden cursor-pointer group relative"
                        onClick={() => setSelectedImage(selectedImage?.id === image.id ? null : image)}
                      >
                        <div className="relative overflow-hidden">
                          <img
                            src={image.image_url}
                            alt={`Ad for ${project.business_name}`}
                            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          {image.aspect_ratio && (
                            <Badge className="absolute top-2 right-2 bg-black/60 text-white text-xs">
                              {image.aspect_ratio}
                            </Badge>
                          )}
                          {/* Delete icon */}
                          <button
                            onClick={(e) => handleDeleteImage(e, image.id)}
                            disabled={deletingImageId === image.id}
                            className="absolute top-2 left-2 p-2 rounded-full bg-black/50 hover:bg-red-600 text-slate-300 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100 z-10 disabled:opacity-50"
                            title="Delete this ad"
                          >
                            {deletingImageId === image.id ? (
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
                        </div>
                        <CardContent className="pt-3 pb-3">
                          <p className="text-xs text-slate-500">
                            {new Date(image.created_at).toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-8 text-center">
                      <p className="text-slate-500">No images generated for this campaign yet.</p>
                    </CardContent>
                  </Card>
                )}

                {/* Expanded Image View */}
                {selectedImage && campaign.generated_images?.some(img => img.id === selectedImage.id) && (
                  <Card className="mt-6 bg-slate-800 border-blue-500/30">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-lg">Ad Detail</CardTitle>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedImage(null)}
                          className="text-slate-400 hover:text-white"
                        >
                          ✕ Close
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="rounded-lg overflow-hidden">
                          <img
                            src={selectedImage.image_url}
                            alt={`Ad for ${project.business_name}`}
                            className="w-full h-auto rounded-lg"
                          />
                        </div>
                        <div className="space-y-4">
                          <div className="flex gap-4">
                            {selectedImage.aspect_ratio && (
                              <div>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-1">
                                  Aspect Ratio
                                </h3>
                                <Badge className="bg-blue-600/20 text-blue-300">
                                  {selectedImage.aspect_ratio}
                                </Badge>
                              </div>
                            )}
                            <div>
                              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-1">
                                Generated
                              </h3>
                              <p className="text-slate-300 text-sm">
                                {new Date(selectedImage.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="pt-2 flex gap-3">
                            <a
                              href={selectedImage.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="flex-1"
                            >
                              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full">
                                ⬇ Download Full Resolution
                              </Button>
                            </a>
                            <Button
                              variant="outline"
                              onClick={(e) => handleDeleteImage(e, selectedImage.id)}
                              disabled={deletingImageId === selectedImage.id}
                              className="border-red-500/50 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600"
                            >
                              {deletingImageId === selectedImage.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-12 text-center">
              <p className="text-slate-400 mb-4">No campaigns found for this project.</p>
              <Link href="/create">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                  Create First Campaign
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
