import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client (browser safe - uses ANON key)
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Types for database operations
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          credits: number;
        };
        Insert: {
          id?: string;
          email: string;
          credits?: number;
        };
        Update: {
          credits?: number;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          industry: string;
          niche: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          industry: string;
          niche: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          product_name: string;
          product_description: string;
          target_audience: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          product_name: string;
          product_description: string;
          target_audience: string;
        };
      };
      generated_images: {
        Row: {
          id: string;
          campaign_id: string;
          concept_id: string;
          image_url: string;
          prompt: string;
          aspect_ratio: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          concept_id: string;
          image_url: string;
          prompt: string;
          aspect_ratio: string;
        };
      };
    };
  };
}

// Helper function to save project
export async function saveProject(
  userId: string,
  businessName: string,
  industry: string,
  niche: string
) {
  const { data, error } = await supabaseClient
    .from('projects')
    .insert({
      user_id: userId,
      business_name: businessName,
      industry,
      niche,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper function to save campaign
export async function saveCampaign(
  projectId: string,
  campaignName: string,
  productName: string,
  productDescription: string,
  targetAudience: string
) {
  const { data, error } = await supabaseClient
    .from('campaigns')
    .insert({
      project_id: projectId,
      name: campaignName,
      product_name: productName,
      product_description: productDescription,
      target_audience: targetAudience,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper function to save generated image
export async function saveGeneratedImage(
  campaignId: string,
  conceptId: string,
  imageUrl: string,
  prompt: string,
  aspectRatio: string
) {
  const { data, error } = await supabaseClient
    .from('generated_images')
    .insert({
      campaign_id: campaignId,
      concept_id: conceptId,
      image_url: imageUrl,
      prompt,
      aspect_ratio: aspectRatio,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper function to retrieve projects
export async function getProjectsByUser(userId: string) {
  console.log('🔗 Querying projects for user:', userId);
  const { data, error } = await supabaseClient
    .from('projects')
    .select(`
      *,
      campaigns (
        *,
        generated_images (*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('🔴 Supabase error:', error);
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }
  
  console.log('✅ Query successful, found projects:', data?.length || 0);
  return data || [];
}

// Helper function to retrieve single project with campaigns and images
export async function getProjectDetails(projectId: string) {
  const { data, error } = await supabaseClient
    .from('projects')
    .select(`
      *,
      campaigns (
        *,
        generated_images (*)
      )
    `)
    .eq('id', projectId)
    .single();

  if (error) throw error;
  return data;
}

// Helper function to delete a generated image
export async function deleteGeneratedImage(imageId: string) {
  const { error } = await supabaseClient
    .from('generated_images')
    .delete()
    .eq('id', imageId);

  if (error) throw error;
}

// Helper function to delete a campaign and its images
export async function deleteCampaign(campaignId: string) {
  // Delete all images in the campaign first
  const { error: imgError } = await supabaseClient
    .from('generated_images')
    .delete()
    .eq('campaign_id', campaignId);
  if (imgError) throw imgError;

  // Then delete the campaign
  const { error } = await supabaseClient
    .from('campaigns')
    .delete()
    .eq('id', campaignId);
  if (error) throw error;
}

// Helper function to delete a project and all its campaigns/images
export async function deleteProject(projectId: string) {
  // First get all campaigns for this project
  const { data: campaigns, error: fetchError } = await supabaseClient
    .from('campaigns')
    .select('id')
    .eq('project_id', projectId);

  if (fetchError) throw fetchError;

  // Delete all images for each campaign
  if (campaigns && campaigns.length > 0) {
    const campaignIds = campaigns.map(c => c.id);
    const { error: imgError } = await supabaseClient
      .from('generated_images')
      .delete()
      .in('campaign_id', campaignIds);
    if (imgError) throw imgError;
  }

  // Delete all campaigns
  const { error: campError } = await supabaseClient
    .from('campaigns')
    .delete()
    .eq('project_id', projectId);
  if (campError) throw campError;

  // Finally delete the project
  const { error } = await supabaseClient
    .from('projects')
    .delete()
    .eq('id', projectId);
  if (error) throw error;
}

// Helper function to upload image to storage
export async function uploadImageToStorage(
  campaignId: string,
  conceptId: string,
  base64Image: string,
  aspectRatio: string
) {
  const fileName = `${campaignId}/${conceptId}-${aspectRatio}-${Date.now()}.png`;
  
  // Convert base64 to blob
  const base64Data = base64Image.replace(/^data:image\/png;base64,/, '');
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const { data, error } = await supabaseClient.storage
    .from('generated-ads')
    .upload(fileName, bytes, {
      contentType: 'image/png',
      cacheControl: '3600',
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabaseClient.storage
    .from('generated-ads')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
