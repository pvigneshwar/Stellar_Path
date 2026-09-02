import { NextResponse } from 'next/server';
import { getAllJobs } from '@/lib/videoState';

export async function GET() {
  try {
    const jobs = getAllJobs();
    
    // Return jobs sorted by creation date, descending
    const sortedJobs = jobs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return NextResponse.json(sortedJobs);

  } catch (error) {
    console.error('Error in /api/video/history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
