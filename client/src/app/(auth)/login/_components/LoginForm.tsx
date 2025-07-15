"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { type CredentialResponse } from "@react-oauth/google"
import { toast } from "sonner"
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import dynamic from 'next/dynamic'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { login, loginWithGoogle } from "@/lib/authApi"
import type { ApiError } from "@/types/api"

const GoogleLoginButton = dynamic(
    () => import('./GoogleLoginButton').then(mod => mod.default),
    { ssr: false }
);

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
})

type LoginData = z.infer<typeof loginSchema>

type LoginState = "idle" | "loading" | "pending-approval" | "error"

export function LoginForm() {
    const [loginState, setLoginState] = useState<LoginState>("idle")
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)

    const router = useRouter()

    const form = useForm<LoginData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    const resetState = () => {
        setLoginState("idle")
        setError(null)
    }

    const handleLoginSuccess = async (message: string) => {
        form.reset()
        toast.success("Welcome back!", {
            description: message,
            duration: 3000,
        })
        router.push("/dashboard")
    }

    const handleLoginError = (err: unknown) => {
        const apiError = err as ApiError

        if (apiError.message?.includes("not approved")) {
            setLoginState("pending-approval")
        } else {
            setLoginState("error")
            setError(apiError.message || "Failed to login. Please try again.")
        }
    }

    const onSubmit = async (data: LoginData) => {
        try {
            setLoginState("loading")
            resetState()

            await login(data.email, data.password)
            handleLoginSuccess("Successfully logged in to your account.")
        } catch (err) {
            handleLoginError(err)
        }
    }

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        if (!credentialResponse?.credential) {
            setError("No credentials received from Google")
            setLoginState("error")
            return
        }

        try {
            setIsGoogleLoading(true)
            resetState()

            await loginWithGoogle(credentialResponse.credential)
            handleLoginSuccess("Successfully logged in with Google.")
        } catch (err) {
            const apiError = err as ApiError

            if (apiError.message?.includes("not approved")) {
                setLoginState("pending-approval")
            } else if (
                apiError.message?.includes("not registered") ||
                apiError.message?.includes("Google account not registered")
            ) {
                toast.message("Please complete your mentor registration to continue.", {
                    duration: 5000,
                })
                router.replace(`/mentor-registration?provider=google&token=${credentialResponse.credential}`)
            } else {
                setLoginState("error")
                setError(apiError.message || "Failed to login with Google")
            }
        } finally {
            setIsGoogleLoading(false)
        }
    }

    const handleGoogleError = () => {
        setLoginState("error")
        setError("Failed to initialize Google login. Please try again or use email login.")
    }

    const isLoading = loginState === "loading" || form.formState.isSubmitting

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="space-y-1 text-center pb-6">
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</CardTitle>
                    <CardDescription className="text-slate-600">Enter your credentials to access your account</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Status Messages */}
                    {loginState === "pending-approval" && (
                        <Alert className="border-amber-200 bg-amber-50">
                            <CheckCircle2 className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-800">
                                Your account is pending approval. An administrator will review your information soon.
                            </AlertDescription>
                        </Alert>
                    )}

                    {loginState === "error" && error && (
                        <Alert className="border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Login Form */}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-medium">Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="Enter your email"
                                                className="h-11 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-medium">Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Enter your password"
                                                    className="h-11 border-slate-200 focus:border-slate-400 focus:ring-slate-400 pr-10"
                                                    {...field}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="h-4 w-4 text-slate-400" />
                                                    ) : (
                                                        <Eye className="h-4 w-4 text-slate-400" />
                                                    )}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    "Sign in"
                                )}
                            </Button>
                        </form>
                    </Form>

                    {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                        <>
                            {/* Divider */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <Separator className="w-full bg-slate-200" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-slate-500 font-medium">Or continue with</span>
                                </div>
                            </div>

                            {/* Google Login */}
                            <GoogleLoginButton
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                                isLoading={isGoogleLoading}
                            />
                        </>
                    )}

                    {/* Registration Link */}
                    <div className="text-center">
                        <p className="text-sm text-slate-600">
                            Don&apos;t have an account?{" "}
                            <Link
                                href="/mentor-registration"
                                className="font-medium text-slate-900 hover:text-slate-700 underline underline-offset-4"
                            >
                                Register as Mentor
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
