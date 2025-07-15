// Pagination types
export interface PaginationParams {
  page: number;
  page_size: number;
}

// Filter types
export interface MentorFilters {
  keyword?: string;
  research_interests?: string[];
  continent?: string;
  country?: string;
  city?: string;
}

interface BaseUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'mentor';
}

export interface User extends BaseUser {
  role: 'admin';
}

// Mentor types
export interface MentorBase {
  email: string;
  full_name: string;
  current_role: string;
  institution: string;
  department: string;
  degrees: string[];
  research_interests: string[];
  continent: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface MentorResponse extends MentorBase {
  id: string;
  full_name: string;
  email: string;
  current_role: string;
  institution: string;
  department: string;
  degrees: string[];
  research_interests: string[];
  city: string;
  country: string;
  continent: string;
  latitude: number;
  longitude: number;
  linkedin_url: string | null;
  profile_picture_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string | null;
  role: 'mentor';
  moderation_status: 'pending' | 'approved' | 'rejected';
  auth_provider: 'email' | 'google' | 'orcid';
  avatar_url?: string;
}

export interface GlobeVisualization {
  id: string;
  full_name: string;
  research_interests: string[];
  latitude: number;
  longitude: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  response?: {
    status: number;
    data?: {
      detail?: string | Array<{
        msg: string;
        loc?: Array<string | number>;
        type?: string;
      }>;
      message?: string;
    };
  };
} 