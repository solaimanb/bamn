from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body
from typing import List, Optional, Any
from sqlalchemy import or_, and_, func, select, cast, ARRAY, String, exists
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import logging

from app.models.mentor import Mentor
from app.models.enums import ModerationStatus
from app.schemas.mentor import (
    MentorProfile,
    SearchResponse,
    MentorResponse,
    MentorUpdate,
    MentorSearch,
    GlobeVisualization
)
from app.api import deps

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mentors", tags=["Mentors"])

@router.get(
    "/search",
    response_model=SearchResponse,
    summary="Search Mentors",
    description="""
    Advanced search for mentors with multiple filtering options:
    - Full-text search across names, institutions, departments, roles, and research interests
    - Search in degrees and academic qualifications
    - Search by email
    - Filter by research interest tags
    - Geographic filtering by continent, country, and city
    - Combined filtering support
    """
)
async def search_mentors(
    db: AsyncSession = Depends(deps.get_db),
    keyword: Optional[str] = Query(None, description="Full-text search term"),
    research_interests: List[str] = Query([], description="Filter by research interest tags"),
    continent: Optional[str] = Query(None, description="Filter by continent"),
    country: Optional[str] = Query(None, description="Filter by country"),
    city: Optional[str] = Query(None, description="Filter by city"),
    page: int = Query(1, description="Page number"),
    page_size: int = Query(10, description="Results per page")
) -> SearchResponse:
    """Advanced search for mentors with multiple filtering options"""
    try:
        logger.info(f"Search request - keyword: {keyword}, interests: {research_interests}, location: {continent}/{country}/{city}")
        
        # Start with base query
        query = select(Mentor).where(Mentor.moderation_status == ModerationStatus.APPROVED)
        
        # Full-text search across all relevant fields
        if keyword:
            keyword = keyword.strip().lower()
            logger.debug(f"Applying keyword filter: {keyword}")
            query = query.where(
                or_(
                    func.lower(Mentor.full_name).contains(keyword),
                    func.lower(Mentor.email).contains(keyword),
                    func.lower(Mentor.institution).contains(keyword),
                    func.lower(Mentor.department).contains(keyword),
                    func.lower(Mentor.current_role).contains(keyword),
                    func.lower(func.array_to_string(Mentor.research_interests, ' ', '')).contains(keyword),
                    func.lower(func.array_to_string(Mentor.degrees, ' ', '')).contains(keyword)
                )
            )
        
        # Research interest tags filter
        if research_interests:
            interests_lower = [interest.lower() for interest in research_interests]
            logger.debug(f"Applying research interests filter: {interests_lower}")
            
            # Use array_to_string for case-insensitive search with OR logic
            # This returns mentors who have ANY of the specified interests
            query = query.where(
                or_(*[
                    func.lower(func.array_to_string(Mentor.research_interests, ',', '')).like(f'%{interest.lower()}%')
                    for interest in research_interests
                ])
            )
        
        # Geographic filters (case-insensitive)
        if continent:
            logger.debug(f"Applying continent filter: {continent}")
            query = query.where(func.lower(Mentor.continent) == continent.lower())
        if country:
            logger.debug(f"Applying country filter: {country}")
            query = query.where(func.lower(Mentor.country) == country.lower())
        if city:
            logger.debug(f"Applying city filter: {city}")
            query = query.where(func.lower(Mentor.city) == city.lower())
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query) or 0
        logger.debug(f"Total results before pagination: {total}")
        
        # Apply pagination
        query = query.offset((page - 1) * page_size).limit(page_size)
        
        # Execute query and get results
        result = await db.execute(query)
        mentors = result.scalars().all()
        
        # Convert to list and ensure proper serialization
        mentor_list = list(mentors)
        logger.info(f"Search completed - found {len(mentor_list)} results (page {page} of {(total + page_size - 1) // page_size})")
        
        # Create response with proper typing
        response = SearchResponse(
            items=mentor_list,
            total=total,
            page=page,
            page_size=page_size
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error performing search: {str(e)}"
        )

@router.get(
    "/tags/suggest",
    response_model=List[str],
    summary="Tag Auto-suggestions",
    description="Get research interest tag suggestions based on partial input"
)
async def suggest_tags(
    db: AsyncSession = Depends(deps.get_db),
    prefix: str = Query(..., min_length=1, description="Tag prefix to search for"),
    limit: int = Query(10, le=50, description="Maximum number of suggestions to return")
) -> List[str]:
    """Get tag suggestions for auto-complete"""
    query = select(Mentor.research_interests).where(
        Mentor.moderation_status == ModerationStatus.APPROVED
    )
    result = await db.execute(query)
    all_tags = result.scalars().all()
    
    unique_tags = set(tag.lower() for tags in all_tags for tag in tags)
    
    prefix = prefix.lower()
    matching_tags = [
        tag for tag in unique_tags 
        if tag.startswith(prefix)
    ]
    
    return sorted(matching_tags)[:limit]

@router.put(
    "/me",
    response_model=MentorResponse,
    summary="Update Profile",
    description="Update current mentor's profile. Authentication required."
)
async def update_profile(
    update_data: MentorUpdate,
    current_mentor: Mentor = Depends(deps.get_current_mentor),
    db: AsyncSession = Depends(deps.get_db)
) -> MentorResponse:
    """Update authenticated mentor's profile"""
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(current_mentor, field, value)
    
    db.add(current_mentor)
    await db.commit()
    await db.refresh(current_mentor)
    
    return current_mentor

@router.get(
    "/me",
    response_model=MentorResponse,
    summary="Get Own Profile",
    description="Get current mentor's profile. Authentication required."
)
async def get_own_profile(
    current_mentor: Mentor = Depends(deps.get_current_mentor)
) -> MentorResponse:
    """Get authenticated mentor's profile"""
    return current_mentor

@router.get(
    "/globe",
    response_model=List[MentorResponse],
    summary="Globe Data",
    description="""
    Get mentor data formatted for globe visualization.
    Returns full mentor data for approved mentors.
    No authentication required - this endpoint is public.
    """
)
async def get_globe_data(
    db: AsyncSession = Depends(deps.get_db),
    research_interests: List[str] = Query([], description="Filter by research interests")
) -> List[MentorResponse]:
    """Get mentor data for globe visualization"""
    query = select(Mentor).where(Mentor.moderation_status == ModerationStatus.APPROVED)
    
    if research_interests:
        for interest in research_interests:
            query = query.where(Mentor.research_interests.any(interest))
    
    result = await db.execute(query)
    mentors = result.scalars().all()
    return mentors

@router.get(
    "/{mentor_id}",
    response_model=MentorResponse,
    summary="Get Mentor",
    description="""
    Get detailed information about a specific mentor.
    Only approved profiles are visible.
    No authentication required - this endpoint is public.
    """
)
async def get_mentor(
    mentor_id: UUID = Path(..., description="The UUID of the mentor to retrieve"),
    db: AsyncSession = Depends(deps.get_db)
) -> MentorResponse:
    """Get a specific mentor profile"""
    query = select(Mentor).where(
        Mentor.id == mentor_id,
        Mentor.moderation_status == ModerationStatus.APPROVED
    )
    result = await db.execute(query)
    mentor = result.scalar_one_or_none()
    
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mentor not found"
        )
    
    return mentor