import { SendCodeForm } from "../SendCodeForm";

// SignUp.dc.html without the password: name and email, then a code.
export default function SignUpPage() {
  return <SendCodeForm intent="signup" />;
}
