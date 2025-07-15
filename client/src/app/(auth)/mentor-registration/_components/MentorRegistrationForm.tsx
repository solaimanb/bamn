/**
 * MentorRegistrationForm - A comprehensive form component for mentor registration
 * Handles user input validation, location selection, and form submission
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { TagInput } from '@/components/ui/tag-input';
import { register, registerWithOAuth } from '@/lib/authApi';
import { LocationMap } from './LocationMap';
import { ApiError } from '@/types/api';
import { jwtDecode } from 'jwt-decode';

interface GoogleTokenData {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

const mentorRegistrationSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(254, 'Email is too long')
    .refine(email => {
      const lowercaseEmail = email.toLowerCase();
      if (lowercaseEmail !== email) return false;
      if (email.includes('..')) return false;
      return true;
    }, 'Please use lowercase letters and avoid consecutive dots'),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long')
    .refine(
      password => /[0-9]/.test(password),
      'Password must contain at least one number'
    )
    .refine(
      password => /[^a-zA-Z0-9]/.test(password),
      'Password must contain at least one special character'
    )
    .optional()  // Make password optional for OAuth
    .or(z.literal('')),  // Allow empty string for OAuth

  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name is too long')
    .regex(/^[a-zA-Z\s.\-']+$/, 'Name can only contain letters, spaces, dots, hyphens, and apostrophes')
    .refine(name => name.trim() === name, 'Name cannot start or end with whitespace'),

  current_role: z.string()
    .min(2, 'Current role is required')
    .max(100, 'Current role is too long')
    .refine(role => role.trim() === role, 'Role cannot start or end with whitespace'),

  institution: z.string()
    .min(2, 'Institution is required')
    .max(200, 'Institution name is too long')
    .refine(inst => inst.trim() === inst, 'Institution cannot start or end with whitespace'),

  department: z.string()
    .min(2, 'Department is required')
    .max(100, 'Department name is too long')
    .refine(dept => dept.trim() === dept, 'Department cannot start or end with whitespace'),

  degrees: z.array(z.string())
    .min(1, 'At least one degree is required')
    .max(10, 'Maximum 10 degrees allowed')
    .refine(
      (degrees) => degrees.every(d => d.length >= 2 && d.length <= 100),
      'Each degree must be between 2 and 100 characters'
    ),

  research_interests: z.array(z.string())
    .min(1, 'At least one research interest is required')
    .max(15, 'Maximum 15 research interests allowed')
    .refine(
      (interests) => interests.every(i => i.length >= 2 && i.length <= 50),
      'Each research interest must be between 2 and 50 characters'
    ),

  continent: z.string()
    .min(2, 'Continent is required')
    .max(20, 'Invalid continent name')
    .refine(cont => cont.trim() === cont, 'Continent cannot start or end with whitespace'),

  country: z.string()
    .min(2, 'Country is required')
    .max(100, 'Country name is too long')
    .refine(country => country.trim() === country, 'Country cannot start or end with whitespace'),

  city: z.string()
    .min(2, 'City is required')
    .max(100, 'City name is too long')
    .refine(city => city.trim() === city, 'City cannot start or end with whitespace'),

  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .refine(lat => !isNaN(lat), 'Invalid latitude'),

  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .refine(lng => !isNaN(lng), 'Invalid longitude'),

  linkedin_url: z.string()
    .max(500, 'LinkedIn URL is too long')
    .refine(
      url => url === '' || url.startsWith('https://www.linkedin.com/'),
      'Must be a valid LinkedIn URL starting with https://www.linkedin.com/'
    )
    .optional()
    .or(z.literal('')),
});

type MentorRegistrationData = z.infer<typeof mentorRegistrationSchema>;

export function MentorRegistrationForm() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthFlow, setIsOAuthFlow] = useState(false);
  const [oAuthToken, setOAuthToken] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<MentorRegistrationData>({
    resolver: zodResolver(mentorRegistrationSchema),
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      current_role: '',
      institution: '',
      department: '',
      degrees: [],
      research_interests: [],
      continent: '',
      country: '',
      city: '',
      latitude: 0,
      longitude: 0,
      linkedin_url: '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!searchParams) return;
    const provider = searchParams.get('provider');
    const token = searchParams.get('token');

    if (provider === 'google' && token) {
      try {
        console.log('Decoding Google token for registration');
        const decoded = jwtDecode<GoogleTokenData>(token);
        console.log('Successfully decoded token for:', decoded.email);

        setIsOAuthFlow(true);
        setOAuthToken(token);

        // Pre-fill form fields with Google data
        form.setValue('email', decoded.email);
        form.setValue('full_name', decoded.name);
        form.setValue('password', ''); // Clear password field for OAuth
      } catch (error) {
        console.error('Failed to decode Google token:', error);
        setError('Failed to decode Google token. Please try again.');
        router.replace('/login');
      }
    }
  }, [searchParams, form, router]);

  const onSubmit = useCallback(async (data: MentorRegistrationData) => {
    try {
      setError(null);
      setIsSubmitting(true);

      const normalizedData = {
        ...data,
        email: data.email.toLowerCase().trim(),
        full_name: data.full_name.trim(),
        current_role: data.current_role.trim(),
        institution: data.institution.trim(),
        department: data.department.trim(),
        degrees: data.degrees
          .map(d => d.trim())
          .filter(d => d.length > 0),
        research_interests: data.research_interests
          .map(i => i.trim())
          .filter(i => i.length > 0),
        continent: data.continent.trim(),
        country: data.country.trim(),
        city: data.city.trim(),
        linkedin_url: data.linkedin_url?.trim() || '',
      };

      if (isOAuthFlow && oAuthToken) {
        console.log('Registering with Google OAuth');
        const decoded = jwtDecode<GoogleTokenData>(oAuthToken);
        await registerWithOAuth({
          ...normalizedData,
          auth_provider: 'google' as const,
          google_id: decoded.sub
        });
        console.log('OAuth registration successful');
      } else {
        if (!normalizedData.password) {
          setError('Password is required for email registration');
          return;
        }
        console.log('Registering with email/password');
        await register(normalizedData as Required<MentorRegistrationData>);
        console.log('Email registration successful');
      }

      router.push('/registration-success');
    } catch (err) {
      console.error('Registration error:', err);
      const apiError = err as ApiError;

      if (apiError.code === 'VALIDATION_ERROR' && apiError.response?.data?.detail) {
        const detail = apiError.response.data.detail;
        if (Array.isArray(detail)) {
          detail.forEach(error => {
            if (error.loc && error.loc.length > 1) {
              const fieldName = error.loc[1] as keyof MentorRegistrationData;
              form.setError(fieldName, {
                type: 'server',
                message: error.msg
              });
            }
          });
          setError('Please correct the highlighted fields and try again.');
        } else {
          setError(detail as string);
        }
      } else {
        setError(apiError.message || 'Failed to register. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [router, form, isOAuthFlow, oAuthToken]);

  const handleLocationSelect = useCallback((details: {
    latitude: number;
    longitude: number;
    continent: string;
    country: string;
    city: string;
  }) => {
    form.setValue('latitude', details.latitude, { shouldValidate: true });
    form.setValue('longitude', details.longitude, { shouldValidate: true });
    form.setValue('continent', details.continent, { shouldValidate: true });
    form.setValue('country', details.country, { shouldValidate: true });
    form.setValue('city', details.city, { shouldValidate: true });
  }, [form]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
        noValidate
      >
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-primary">Basic Information</h3>
                <p className="text-sm text-muted-foreground">Please provide your account details.</p>
              </div>

              <div className="grid gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="email">Email</FormLabel>
                      <FormControl>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          autoComplete="email"
                          aria-describedby="email-description"
                          disabled={isOAuthFlow}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isOAuthFlow && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="password">Password</FormLabel>
                        <FormControl>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            autoComplete="new-password"
                            aria-describedby="password-description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <FormDescription id="password-description">
                          Must be at least 8 characters with a number and special character
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="full_name">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          id="full_name"
                          placeholder="Enter your full name"
                          autoComplete="name"
                          aria-describedby="name-description"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription id="name-description" className="text-xs">
                        Your name as it will appear to students
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-primary">Academic Information</h3>
                <p className="text-sm text-muted-foreground">Tell us about your academic background and expertise.</p>
              </div>

              <div className="grid gap-6">
                <FormField
                  control={form.control}
                  name="current_role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="current_role">Current Role</FormLabel>
                      <FormControl>
                        <Input
                          id="current_role"
                          placeholder="e.g., Associate Professor, Research Scientist"
                          autoComplete="organization-title"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="institution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="institution">Institution</FormLabel>
                      <FormControl>
                        <Input
                          id="institution"
                          placeholder="Enter your current institution"
                          autoComplete="organization"
                          {...field}
                        />
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
                      <FormLabel htmlFor="department">Department</FormLabel>
                      <FormControl>
                        <Input
                          id="department"
                          placeholder="Enter your department"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="degrees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="degrees">Degrees</FormLabel>
                      <FormControl>
                        <TagInput
                          id="degrees"
                          placeholder="Type a degree and press Enter or comma (e.g., Ph.D. in Physics, MIT, 2020)"
                          aria-describedby="degrees-description"
                          tags={field.value}
                          setTags={(newTags) => field.onChange(newTags)}
                        />
                      </FormControl>
                      <FormDescription id="degrees-description" className="text-xs">
                        List your degrees, including institution and year (max 10)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="research_interests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="research_interests">Research Interests</FormLabel>
                      <FormControl>
                        <TagInput
                          id="research_interests"
                          placeholder="Type an interest and press Enter or comma"
                          aria-describedby="interests-description"
                          tags={field.value}
                          setTags={(newTags) => field.onChange(newTags)}
                        />
                      </FormControl>
                      <FormDescription id="interests-description" className="text-xs">
                        Areas you can mentor students in (max 15)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-primary">Location Information</h3>
                <p className="text-sm text-muted-foreground">Select your location on the map or enter manually.</p>
              </div>

              <LocationMap
                latitude={form.watch('latitude')}
                longitude={form.watch('longitude')}
                onLocationSelect={handleLocationSelect}
              />

              <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="continent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="continent">Continent</FormLabel>
                        <FormControl>
                          <Input
                            id="continent"
                            placeholder="Your continent"
                            {...field}
                          />
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
                        <FormLabel htmlFor="country">Country</FormLabel>
                        <FormControl>
                          <Input
                            id="country"
                            placeholder="Your country"
                            autoComplete="country-name"
                            {...field}
                          />
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
                        <FormLabel htmlFor="city">City</FormLabel>
                        <FormControl>
                          <Input
                            id="city"
                            placeholder="Your city"
                            autoComplete="address-level2"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="latitude">Latitude</FormLabel>
                        <FormControl>
                          <Input
                            id="latitude"
                            type="number"
                            step="any"
                            inputMode="decimal"
                            value={field.value || 0}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              field.onChange(isNaN(value) ? 0 : value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="longitude">Longitude</FormLabel>
                        <FormControl>
                          <Input
                            id="longitude"
                            type="number"
                            step="any"
                            inputMode="decimal"
                            value={field.value || 0}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              field.onChange(isNaN(value) ? 0 : value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-primary">Additional Information</h3>
                <p className="text-sm text-muted-foreground">Optional details to enhance your profile.</p>
              </div>

              <FormField
                control={form.control}
                name="linkedin_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="linkedin_url">LinkedIn Profile URL (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        id="linkedin_url"
                        type="url"
                        placeholder="https://www.linkedin.com/in/your-profile"
                        aria-describedby="linkedin-description"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription id="linkedin-description" className="text-xs">
                      Your professional LinkedIn profile
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            className="w-full md:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              'Register as Mentor'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 