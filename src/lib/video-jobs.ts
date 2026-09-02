import fs from 'fs';
import path from 'path';

export interface OpenRouterVideoJob {
  id: string;
  segmentId: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  resultUrl?: string; // Original URL from OpenRouter
  localVideoPath?: string; // Path to downloaded video in /generated-videos/
  continuityFramePath?: string; // Path to extracted frame in /continuity-frames/
  error?: string;
  model: string;
  retryCount: number;
}

const JOBS_FILE = path.join(process.cwd(), 'storyboard-data', 'jobs.json');

function ensureJobsFile() {
  if (!fs.existsSync(path.dirname(JOBS_FILE))) {
    fs.mkdirSync(path.dirname(JOBS_FILE), { recursive: true });
  }
  if (!fs.existsSync(JOBS_FILE)) {
    fs.writeFileSync(JOBS_FILE, JSON.stringify([]), 'utf-8');
  }
}

export function getAllVideoJobs(): OpenRouterVideoJob[] {
  try {
    ensureJobsFile();
    const data = fs.readFileSync(JOBS_FILE, 'utf-8');
    return JSON.parse(data) as OpenRouterVideoJob[];
  } catch (error) {
    console.error('Error reading openrouter video jobs:', error);
    return [];
  }
}

export function saveVideoJob(job: OpenRouterVideoJob): void {
  try {
    const jobs = getAllVideoJobs();
    const existingIndex = jobs.findIndex((j) => j.id === job.id);
    
    if (existingIndex >= 0) {
      jobs[existingIndex] = { ...jobs[existingIndex], ...job, updatedAt: new Date().toISOString() };
    } else {
      jobs.push(job);
    }
    
    fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving openrouter video job:', error);
  }
}

export function getVideoJob(id: string): OpenRouterVideoJob | undefined {
  const jobs = getAllVideoJobs();
  return jobs.find((j) => j.id === id);
}
