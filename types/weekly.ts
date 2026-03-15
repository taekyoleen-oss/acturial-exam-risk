import type { VirtualQuestion } from './question';

export interface Article {
  title: string;
  source: string;
  url: string;
  summary: string;
  published_at: string;
  keywords: string[];
}

export interface WeeklyIssue {
  id: string;
  issue_date: string;
  week_label: string;
  articles: Article[];
  questions: VirtualQuestion[];
  generated_at: string | null;
  status: 'draft' | 'published' | 'failed';
}

export interface WeeklyIssueSummary {
  id: string;
  issue_date: string;
  week_label: string;
  status: string;
  generated_at: string | null;
}
