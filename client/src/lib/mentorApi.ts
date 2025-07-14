import { MentorFilters, MentorResponse, PaginatedResponse } from '@/types/api';
import { API_ROUTES, API_BASE_URL } from '@/constants/api';
import api from './api';

interface ListMentorsParams extends MentorFilters {
  page?: number;
  page_size?: number;
  include_all?: boolean;
}

export async function getMentorGlobeData(): Promise<MentorResponse[]> {
  const response = await fetch(`${API_BASE_URL}${API_ROUTES.MENTORS.GLOBE}`);

  if (!response.ok) {
    throw new Error('Failed to fetch globe data');
  }

  return response.json();
}

export async function listMentors(params: ListMentorsParams = {}): Promise<PaginatedResponse<MentorResponse>> {
  const searchParams = new URLSearchParams();

  if (!params.include_all) {
    if (params.keyword) searchParams.set('keyword', params.keyword);
    if (params.research_interests) searchParams.set('research_interests', params.research_interests.join(','));
    if (params.continent) searchParams.set('continent', params.continent);
    if (params.country) searchParams.set('country', params.country);
    if (params.city) searchParams.set('city', params.city);
  }

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.page_size) searchParams.set('page_size', params.page_size.toString());

  const response = await fetch(`${API_BASE_URL}${API_ROUTES.MENTORS.LIST}?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch mentors');
  }

  return response.json();
}

export async function getMentor(id: string): Promise<MentorResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ROUTES.MENTORS.DETAIL(id)}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Mentor not found');
    }
    throw new Error('Failed to fetch mentor');
  }

  return response.json();
}

export async function getOwnProfile(): Promise<MentorResponse> {
  return api.get(API_ROUTES.MENTORS.PROFILE);
}

export async function updateOwnProfile(data: Partial<MentorResponse>): Promise<MentorResponse> {
  return api.put(API_ROUTES.MENTORS.PROFILE, data);
} 