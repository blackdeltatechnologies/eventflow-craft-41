import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { motion } from "framer-motion";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  useEffect(() => {
    if (user) navigate("/dashboard/events", { replace: true });
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      navigate("/dashboard/events");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: { full_name: signupName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Check your email to confirm, or you may be logged in automatically.");
      navigate("/dashboard/events");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Subtle decorative shapes like the landing page confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[8%] w-16 h-16 rounded-full bg-primary/10 blur-sm" />
        <div className="absolute top-[20%] right-[12%] w-12 h-12 rounded-lg bg-primary/8 rotate-12 blur-sm" />
        <div className="absolute bottom-[15%] left-[15%] w-10 h-10 rounded-full bg-primary/10 blur-sm" />
        <div className="absolute bottom-[25%] right-[8%] w-14 h-14 rounded-lg bg-primary/6 -rotate-12 blur-sm" />
        <div className="absolute top-[50%] left-[5%] w-8 h-8 rounded-full bg-muted-foreground/5 blur-sm" />
        <div className="absolute top-[40%] right-[5%] w-20 h-20 rounded-full bg-primary/5 blur-md" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <Logo size="lg" />
          </Link>
          <p className="text-muted-foreground mt-2 text-sm font-body">
            Create events people actually want to attend
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-card rounded-2xl border border-border shadow-lg p-6">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted p-1 mb-6">
              <TabsTrigger value="login" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm font-medium">
                Log in
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm font-medium">
                Sign up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email-login" className="text-sm font-medium text-foreground">Email</Label>
                  <Input
                    id="email-login"
                    type="email"
                    placeholder="you@company.com"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="rounded-full h-11 px-4 border-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-login" className="text-sm font-medium text-foreground">Password</Label>
                  <Input
                    id="password-login"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="rounded-full h-11 px-4 border-input"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full h-11 bg-foreground text-background hover:bg-foreground/90 font-medium" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>



            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name-signup" className="text-sm font-medium text-foreground">Full name</Label>
                  <Input
                    id="name-signup"
                    placeholder="Jane Doe"
                    required
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    className="rounded-full h-11 px-4 border-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-signup" className="text-sm font-medium text-foreground">Email</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="you@company.com"
                    required
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    className="rounded-full h-11 px-4 border-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-signup" className="text-sm font-medium text-foreground">Password</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    className="rounded-full h-11 px-4 border-input"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full h-11 bg-foreground text-background hover:bg-foreground/90 font-medium" disabled={loading}>
                  {loading ? "Creating account…" : "Create account"}
                </Button>
              </form>

            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
