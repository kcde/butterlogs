import { SendCodeForm } from "../SendCodeForm";

// LogIn.dc.html without the password and "Forgot password?": email, then a code.
export default function LogInPage() {
  return <SendCodeForm intent="login" />;
}
