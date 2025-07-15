'use client';

import { useEffect, useState, memo, useMemo, useCallback } from 'react';
import { getOwnProfile, updateOwnProfile } from '@/lib/mentorApi';
import { MentorResponse } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { MapPin, Mail, Building2, GraduationCap, BookOpen, Globe2, PencilLine, User, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface ProfileFieldProps {
  icon: React.ElementType;
  label: string;
  value: string | string[];
  isLoading?: boolean;
  description?: string;
}

const ProfileField = memo(({ icon: Icon, label, value, isLoading, description }: ProfileFieldProps) => {
  const displayValue = useMemo(() =>
    Array.isArray(value) ? value.map(v => (
      <Badge key={v} variant="secondary" className="mr-2 mb-2">
        {v}
      </Badge>
    )) : value
    , [value]);

  if (isLoading) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
        <Skeleton className="h-5 w-5 rounded-md" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-3 w-[150px]" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <Icon className="h-5 w-5 text-primary mt-1" />
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="mt-1">
          {Array.isArray(value) ? (
            <div className="flex flex-wrap gap-1">{displayValue}</div>
          ) : (
            <p className="font-medium">{displayValue}</p>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </motion.div>
  );
});
ProfileField.displayName = 'ProfileField';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  institution: z.string().min(2, 'Institution is required'),
  department: z.string().min(2, 'Department is required'),
  degrees: z.string().min(2, 'At least one degree is required'),
  research_interests: z.string().min(2, 'At least one research interest is required'),
  continent: z.string().min(2, 'Continent is required'),
  country: z.string().min(2, 'Country is required'),
  city: z.string().min(2, 'City is required'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface UpdateProfileData extends Omit<ProfileFormValues, 'degrees' | 'research_interests'> {
  degrees: string[];
  research_interests: string[];
}

const EditProfileDialog = memo(({ profile, onUpdate }: {
  profile: MentorResponse | null;
  onUpdate: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues = useMemo(() => ({
    full_name: profile?.full_name || '',
    institution: profile?.institution || '',
    department: profile?.department || '',
    degrees: profile?.degrees?.join(', ') || '',
    research_interests: profile?.research_interests?.join(', ') || '',
    continent: profile?.continent || '',
    country: profile?.country || '',
    city: profile?.city || '',
  }), [profile]);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  // Reset form when dialog opens/closes or profile changes
  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
    }
  }, [isOpen, form, defaultValues]);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      setIsSubmitting(true);
      const updateData: UpdateProfileData = {
        ...values,
        degrees: values.degrees.split(',').map(s => s.trim()).filter(Boolean),
        research_interests: values.research_interests.split(',').map(s => s.trim()).filter(Boolean),
      };
      await updateOwnProfile(updateData);
      toast.success('Profile updated successfully');
      setIsOpen(false);
      onUpdate();
    } catch (error) {
      toast.error('Failed to update profile. Please try again.');
      console.error('Profile update error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      form.reset(defaultValues);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto hover:bg-primary hover:text-primary-foreground transition-colors">
          <PencilLine className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Make changes to your profile here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <Separator className="my-4" />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} className="transition-all focus:ring-2 focus:ring-primary/20" />
                  </FormControl>
                  <FormDescription>
                    Your full name as it will appear to other users
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="institution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institution</FormLabel>
                    <FormControl>
                      <Input {...field} className="transition-all focus:ring-2 focus:ring-primary/20" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input {...field} className="transition-all focus:ring-2 focus:ring-primary/20" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="degrees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Degrees (comma-separated)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ph.D., M.Sc., B.Sc." className="transition-all focus:ring-2 focus:ring-primary/20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="research_interests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Research Interests (comma-separated)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Machine Learning, Data Science, AI" className="transition-all focus:ring-2 focus:ring-primary/20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="continent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Continent</FormLabel>
                    <FormControl>
                      <Input {...field} className="transition-all focus:ring-2 focus:ring-primary/20" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} className="transition-all focus:ring-2 focus:ring-primary/20" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} className="transition-all focus:ring-2 focus:ring-primary/20" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
});
EditProfileDialog.displayName = 'EditProfileDialog';

const ProfileHeader = memo(({ profile, onUpdate, isLoading }: { 
  profile: MentorResponse | null; 
  onUpdate: () => void;
  isLoading: boolean;
}) => (
  <div className="flex items-center justify-between mb-8 bg-card p-6 rounded-lg shadow-sm">
    <div className="flex items-center gap-4">
      {isLoading ? (
        <>
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </div>
        </>
      ) : (
        <>
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
            <AvatarFallback>
              <User className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{profile?.full_name || 'Loading...'}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your profile and preferences
            </p>
          </div>
        </>
      )}
    </div>
    <EditProfileDialog profile={profile} onUpdate={onUpdate} />
  </div>
));
ProfileHeader.displayName = 'ProfileHeader';

const PersonalInfoCard = memo(({ profile, isLoading }: { profile: MentorResponse | null; isLoading: boolean }) => (
  <Card className="transition-all hover:shadow-md">
    <CardHeader>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[250px]" />
        </div>
      ) : (
        <>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Personal Information
          </CardTitle>
          <CardDescription>Your basic information and credentials</CardDescription>
        </>
      )}
    </CardHeader>
    <CardContent className="space-y-1">
      <ProfileField
        icon={Mail}
        label="Email Address"
        value={profile?.email || ''}
        isLoading={isLoading}
        description="Your primary contact email"
      />
      <ProfileField
        icon={Building2}
        label="Institution"
        value={profile?.institution || ''}
        isLoading={isLoading}
      />
      <ProfileField
        icon={GraduationCap}
        label="Department"
        value={profile?.department || ''}
        isLoading={isLoading}
      />
      <ProfileField
        icon={GraduationCap}
        label="Academic Degrees"
        value={profile?.degrees || []}
        isLoading={isLoading}
      />
    </CardContent>
  </Card>
));
PersonalInfoCard.displayName = 'PersonalInfoCard';

const ResearchLocationCard = memo(({ profile, isLoading }: { profile: MentorResponse | null; isLoading: boolean }) => {
  const locationValue = useMemo(() => {
    if (!profile?.city && !profile?.country) return '';
    return [profile.city, profile.country].filter(Boolean).join(', ');
  }, [profile?.city, profile?.country]);

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-4 w-[250px]" />
          </div>
        ) : (
          <>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Research & Location
            </CardTitle>
            <CardDescription>Your research interests and location details</CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        <ProfileField
          icon={BookOpen}
          label="Research Interests"
          value={profile?.research_interests || []}
          isLoading={isLoading}
          description="Areas of expertise and research focus"
        />
        <ProfileField
          icon={Globe2}
          label="Continent"
          value={profile?.continent || ''}
          isLoading={isLoading}
        />
        <ProfileField
          icon={MapPin}
          label="Location"
          value={locationValue}
          isLoading={isLoading}
          description="Your current location"
        />
      </CardContent>
    </Card>
  );
});
ResearchLocationCard.displayName = 'ResearchLocationCard';

const ErrorAlert = memo(({ error }: { error: Error }) => (
  <Alert variant="destructive" className="animate-in slide-in-from-top-2">
    <AlertTitle>Error Loading Profile</AlertTitle>
    <AlertDescription>
      {error.message || 'Failed to load profile. Please try again later.'}
    </AlertDescription>
  </Alert>
));
ErrorAlert.displayName = 'ErrorAlert';

const LoadingState = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="space-y-6"
  >
    <div className="flex items-center justify-between mb-8 bg-card p-6 rounded-lg shadow-sm">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
      </div>
      <Skeleton className="h-9 w-[120px]" />
    </div>
    <div className="grid gap-6 md:grid-cols-2">
      {[0, 1].map((i) => (
        <Card key={i} className="transition-all hover:shadow-md">
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[250px]" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="flex items-start gap-3 p-3">
                <Skeleton className="h-5 w-5 rounded-md" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-6 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  </motion.div>
);

const ProfilePage = () => {
  const [profile, setProfile] = useState<MentorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getOwnProfile();
      setProfile(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (error) {
    return <ErrorAlert error={error} />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <ProfileHeader profile={profile} onUpdate={fetchProfile} isLoading={isLoading} />
      <div className="grid gap-6 md:grid-cols-2">
        <PersonalInfoCard profile={profile} isLoading={isLoading} />
        <ResearchLocationCard profile={profile} isLoading={isLoading} />
      </div>
    </motion.div>
  );
};

export default ProfilePage;