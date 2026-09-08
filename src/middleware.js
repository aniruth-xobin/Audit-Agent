import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/((?!login|api/auth|api/audit|api/ingest|_next|favicon.png|favicon.ico).*)"],
};
