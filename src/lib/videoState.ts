import fs from 'fs';
import path from 'path';

export interface VideoJob {
  id: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  resultUrl?: string;
  error?: string;
  model: string;
  sceneNumber?: string;
  segmentNumber?: string;
  retryCount?: number;
}

const JOBS_FILE = path.join(process.cwd(), 'videos', 'jobs.json');

function ensureJobsFile() {
  if (!fs.existsSync(path.dirname(JOBS_FILE))) {
    fs.mkdirSync(path.dirname(JOBS_FILE), { recursive: true });
  }
  if (!fs.existsSync(JOBS_FILE)) {
    fs.writeFileSync(JOBS_FILE, JSON.stringify([]), 'utf-8');
  }
}

export function getAllJobs(): VideoJob[] {
  try {
    ensureJobsFile();
    const data = fs.readFileSync(JOBS_FILE, 'utf-8');
    return JSON.parse(data) as VideoJob[];
  } catch (error) {
    console.error('Error reading video jobs:', error);
    return [];
  }
}

export function saveJob(job: VideoJob): void {
  try {
    const jobs = getAllJobs();
    const existingIndex = jobs.findIndex((j) => j.id === job.id);
    
    if (existingIndex >= 0) {
      jobs[existingIndex] = { ...jobs[existingIndex], ...job, updatedAt: new Date().toISOString() };
    } else {
      jobs.push(job);
    }
    
    fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving video job:', error);
  }
}

export function getJob(id: string): VideoJob | undefined {
  const jobs = getAllJobs();
  return jobs.find((j) => j.id === id);
}
