import { NextResponse } from 'next/server';
import { getJob, saveJob } from '@/lib/videoState';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'jobId parameter is required' }, { status: 400 });
    }

    const job = getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return NextResponse.json(job);
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key is not configured' }, { status: 500 });
    }

    // Query OpenRouter for job status
    const statusResponse = await fetch(`https://openrouter.ai/api/v1/generation?id=${jobId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      }
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('OpenRouter status error:', errorText);
      return NextResponse.json({ error: 'Failed to check status with OpenRouter' }, { status: 500 });
    }

    const statusData = await statusResponse.json();

    // Map OpenRouter status to our local status
    // OpenRouter generation endpoint usually returns data containing status
    let updatedStatus: import('@/lib/videoState').VideoJob['status'] = job.status;
    let resultUrl = job.resultUrl;
    
    if (statusData.data) {
       const orStatus = statusData.data.status;
       if (orStatus === 'completed') {
         updatedStatus = 'completed';
         // Assuming the result is a URL to the video in the response
         resultUrl = statusData.data.result || statusData.data.url;
       } else if (orStatus === 'failed') {
         updatedStatus = 'failed';
       } else {
         updatedStatus = 'processing';
       }
    }

    if (updatedStatus !== job.status || resultUrl !== job.resultUrl) {
      job.status = updatedStatus;
      job.resultUrl = resultUrl;
      saveJob(job);
    }

    return NextResponse.json(job);

  } catch (error) {
    console.error('Error in /api/video/status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
