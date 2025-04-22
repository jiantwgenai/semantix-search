// semantix-document-search/src/components/Login.tsx
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/api";

interface LoginProps {
  onSuccess: () => void;
}

const Login = ({ onSuccess }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Attempting login with:', { email });
    try {
      const { token, user } = await login(email, password);
      console.log('Login successful, received token:', token);
      localStorage.setItem('token', token);
      onSuccess();
      
      toast({
        title: "Login successful"
      });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: "Please check your credentials",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center">Login</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" className="w-full">
          Login
        </Button>
      </form>
    </div>
  );
};

export default Login;