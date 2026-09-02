import { NextResponse } from 'next/server';
import { saveJob } from '@/lib/videoState';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, resolution, aspectRatio = '16:9', duration = '00:05', sceneNumber, segmentNumber } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key is not configured' }, { status: 500 });
    }

    const modelId = 'google/veo-3.1-fast';

    // 1. Validate against OpenRouter models endpoint
    const modelsResponse = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!modelsResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch OpenRouter models for validation' }, { status: 500 });
    }

    const modelsData = await modelsResponse.json();
    const veoModel = modelsData.data?.find((m: any) => m.id === modelId);

    if (!veoModel) {
      return NextResponse.json({ error: `Model ${modelId} not found or not supported on OpenRouter` }, { status: 400 });
    }

    // 2. Submit the job
    const generationResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'India Journey Beyond Earth',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        provider: {
          require_parameters: true,
          aspect_ratio: aspectRatio,
          duration: duration,
          audio: false // No audio
        }
      })
    });

    if (!generationResponse.ok) {
      const errorText = await generationResponse.text();
      console.error('OpenRouter generation error:', errorText);
      return NextResponse.json({ error: 'Failed to submit generation job to OpenRouter' }, { status: 500 });
    }

    const generationData = await generationResponse.json();
    
    const jobId = generationData.id || crypto.randomUUID();

    // 3. Save job state
    saveJob({
      id: jobId,
      prompt,
      model: modelId,
      status: 'pending',
      sceneNumber,
      segmentNumber,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ jobId, status: 'pending' });

  } catch (error) {
    console.error('Error in /api/video/generate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
