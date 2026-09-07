import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN || "xobin.com";
      if (user.email && user.email.endsWith(`@${allowedDomain}`)) {
        
        try {
          const { supabaseAdmin } = await import("@/lib/supabase");
          // Track the user login in Supabase
          await supabaseAdmin.from("dashboard_users").upsert({
            email: user.email,
            name: user.name,
            image_url: user.image,
            last_login: new Date().toISOString()
          }, { onConflict: "email" });
        } catch (e) {
          console.error("Failed to log user to DB:", e);
        }

        return true;
      }
      return false; // Access denied
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});

export { handler as GET, handler as POST };
