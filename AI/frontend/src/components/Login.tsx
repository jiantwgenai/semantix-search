// semantix-document-search/src/components/Login.tsx
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, register } from "@/lib/api";

interface LoginProps {
  onSuccess: () => void;
}

const Login = ({ onSuccess }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      await register(email, password);
      setRegistrationSuccess(true);
      setIsRegister(false);
      setEmail("");
      setPassword("");
      return;
    }
    try {
      const { token } = await login(email, password);
      localStorage.setItem('token', token);
      onSuccess();
      toast({ title: "Login successful" });
    } catch (error: any) {
      // Show backend error message if available
      const errorMsg = error?.response?.data?.error || "Please check your credentials";
      toast({
        title: "Login failed",
        description: errorMsg,
        variant: "destructive"
      });
    }
  };

  if (registrationSuccess) {
    return (
      <div>
        <h2>Registration Successful!</h2>
        <Button type="button" onClick={() => setRegistrationSuccess(false)}>
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center">{isRegister ? "Register" : "Login"}</h2>
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
          {isRegister ? "Register" : "Login"}
        </Button>
      </form>
      <div className="text-center">
        {isRegister ? (
          <span>
            Already have an account?{" "}
            <Button variant="link" onClick={() => setIsRegister(false)}>
              Login
            </Button>
          </span>
        ) : (
          <span>
            Don't have an account?{" "}
            <Button variant="link" onClick={() => setIsRegister(true)}>
              Register
            </Button>
          </span>
        )}
      </div>
    </div>
  );
};

export default Login;