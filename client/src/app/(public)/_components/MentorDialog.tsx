import { X, MapPin, Mail, ArrowRight, GraduationCap, Building2 } from 'lucide-react'
import { MentorResponse } from '@/types/api';
import Link from 'next/link';

import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface MentorDialogProps {
    selectedMentor: MentorResponse | null;
    setSelectedMentor: (mentor: MentorResponse | null) => void;
    isLoading: boolean;
}

const MentorDialog: React.FC<MentorDialogProps> = ({ selectedMentor, setSelectedMentor }) => {
    return (
        <Dialog open={!!selectedMentor} onOpenChange={(open: boolean) => !open && setSelectedMentor(null)}>
            <DialogContent className="max-w-[95vw] lg:max-w-lg mx-auto p-0 text-foreground">
                {selectedMentor && (
                    <Card className="border-0 bg-transparent relative mx-2 sm:mx-0">
                        <Button
                            size="icon"
                            onClick={() => setSelectedMentor(null)}
                            className="absolute right-2 top-2 z-10 h-6 w-6 rounded-sm border-none bg-red-500 hover:bg-red-600 transition-colors outline-none"
                        >
                            <X size={20} />
                        </Button>

                        <CardHeader className="px-4 sm:px-6">
                            <div className="flex items-start gap-4">
                                <Avatar className="h-12 w-12 bg-indigo-500">
                                    <AvatarFallback className="text-2xl font-bold">
                                        {selectedMentor.full_name.split(' ')[0][0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <DialogTitle className="text-xl font-bold mb-1 leading-tight">
                                        {selectedMentor.full_name}
                                    </DialogTitle>
                                    {selectedMentor.current_role && (
                                        <div className="mb-2">
                                            <p className="text-sm">{selectedMentor.current_role}</p>
                                        </div>
                                    )}
                                    {selectedMentor.department && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <GraduationCap className="w-4 h-4 text-gray-500" />
                                            <p className="text-xs leading-relaxed">{selectedMentor.department}</p>
                                        </div>
                                    )}
                                    {selectedMentor.institution && (
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-gray-500" />
                                            <p className="text-xs leading-relaxed">{selectedMentor.institution}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardHeader>

                        <Separator className="" />

                        <CardContent className="px-4 sm:px-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-bold mb-4 text-sm tracking-wider uppercase">ABOUT</h3>
                                    <p className="text-sm leading-relaxed">
                                        {`Dr. ${selectedMentor.full_name.split(' ')[1]} is a ${selectedMentor.current_role} at ${selectedMentor.institution}. Their research focuses on advanced topics with real-world applications.`}
                                    </p>
                                </div>

                                <Separator className="" />

                                <div>
                                    <h3 className="font-bold mb-4 text-sm tracking-wider uppercase">RESEARCH KEYWORDS</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedMentor.research_interests.map((interest, index) => (
                                            <Badge
                                                key={index}
                                                variant="secondary"
                                                className="hover:border-0"
                                            >
                                                {interest}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <Separator className="" />

                                <div className="grid grid-cols-2 gap-6">
                                    {selectedMentor.city && (
                                        <div>
                                            <p className="text-xs uppercase tracking-wider mb-2 font-medium">LOCATION</p>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4" />
                                                <span className="text-sm">
                                                    {`${selectedMentor.city}, ${selectedMentor.country}`}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {selectedMentor.email && (
                                        <div>
                                            <p className="text-xs uppercase tracking-wider mb-2 font-medium">EMAIL</p>
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4" />
                                                <a
                                                    href={`mailto:${selectedMentor.email}`}
                                                    className="text-blue-500 hover:text-blue-400 transition-colors text-sm break-all"
                                                >
                                                    {selectedMentor.email}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="px-4 sm:px-6">
                            <Button
                                asChild
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                                size="lg"
                            >
                                <Link href={`/mentors/${selectedMentor.id}`}>
                                    View Full Profile
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default MentorDialog;