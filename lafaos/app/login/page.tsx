import { Suspense } from "react";
import { LoginForm } from "./login-form";

const LoginPage = () => (
  <Suspense>
    <LoginForm />
  </Suspense>
);

export default LoginPage;
