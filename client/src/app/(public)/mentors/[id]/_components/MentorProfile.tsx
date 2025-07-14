"use client"

import { memo } from "react"
import { Mail, MapPin } from "lucide-react"
import type { Mentor } from "@/types/mentor"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ProfileMap } from "./ProfileMap"
import { Card } from "@/components/ui/card"

interface MentorProfileProps {
    mentor: Mentor
}

export const MentorProfile = memo(function MentorProfile({ mentor }: MentorProfileProps) {
    const initials = mentor.full_name
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()

    return (
        <div className="pt-16 lg:pt-20">
            <div className="max-w-3xl mx-auto px-6 py-8">
                <Card className="flex lg:flex-row gap-4 mb-8 borde p-6 shadow-sm">
                    <Avatar size={100} className="h-16 w-16">
                        <AvatarImage src={mentor?.profile_picture_url || "/profile.png"} alt={mentor.full_name} />
                        <AvatarFallback className="bg-blue-500 text-sm font-black">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold mb-1">{mentor.full_name}</h1>
                        <p className="text-lg mb-1">{mentor.current_role}</p>
                        <p className="text-gray-400 text-sm">{mentor.institution}</p>
                        <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                            <MapPin className="w-4 h-4" />
                            <span>{mentor.city}, {mentor.country}</span>
                        </div>
                    </div>
                </Card>

                {/* About Section */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-3">About</h2>
                    <div className="border-l-2 pl-4">
                        <p className="text-sm leading-relaxed">
                            Specializing in {mentor.research_interests.join(", ").toLowerCase()} with focus on advanced research and
                            development in {mentor.department.toLowerCase()}.
                        </p>
                    </div>
                </div>

                {/* Research Areas */}
                {/* <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-3">Research Areas</h2>
                    <div className="border-l-2 pl-4">
                        <div className="flex flex-wrap gap-2">
                            {mentor.research_interests.map((interest) => (
                                <Badge key={interest} className="bg-blue-600 hover:bg-blue-700 border-0 px-3 py-1">
                                    {interest}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div> */}

                {/* Description */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-3">Description</h2>
                    <div className="border-l-2 pl-4 space-y-4">
                        <p className="text-sm leading-relaxed">
                            Specializing in {mentor.research_interests.join(", ").toLowerCase()} with extensive experience in{" "}
                            {mentor.department.toLowerCase()}.
                        </p>
                        <p className="text-sm leading-relaxed">
                            Their research focuses on advanced topics in {mentor.department} with applications in both academic and
                            industry settings. They have published numerous papers in reputable journals and are actively involved in
                            mentoring students from {mentor.country} and contributing to global research collaborations.
                        </p>
                    </div>
                </div>

                {/* Research Keywords and Location Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold mb-3">Research Keywords</h2>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    mentor.country.toLowerCase(),
                                    "academic",
                                    "research",
                                    "mentor",
                                    mentor.department.toLowerCase().replace(/\s+/g, " "),
                                    ...mentor.research_interests.map((i) => i.toLowerCase().replace(/\s+/g, " ")),
                                ].map((keyword, index) => (
                                    <Badge
                                        key={`${keyword}-${index}`}
                                        variant="outline"
                                        className="text-xs px-2 py-1"
                                    >
                                        {keyword}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold mb-3">Contact Information</h2>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-blue-400 hover:text-blue-300 transition-colors">
                                    <Mail className="w-4 h-4" />
                                    <a href={`mailto:${mentor.email}`} className="text-sm">
                                        {mentor.email}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold mb-3">Location</h2>
                        <div className="shadow-lg rounded-lg overflow-hidden border p-1">
                            <div className="h-52 relative">
                                {mentor.latitude && mentor.longitude ? (
                                    <ProfileMap latitude={mentor.latitude} longitude={mentor.longitude} />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">
                                        <span>Location not available</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-3 text-center">
                                <p className="font-medium">{mentor.city}</p>
                                <p className="text-sm">{mentor.country}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})
