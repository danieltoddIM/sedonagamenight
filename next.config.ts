import type {NextConfig} from "next";
const nextConfig:NextConfig={
 poweredByHeader:false,
 async headers(){return [{source:"/:path*",headers:[{key:"X-Content-Type-Options",value:"nosniff"},{key:"Referrer-Policy",value:"no-referrer"},{key:"X-Frame-Options",value:"DENY"},{key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}]},{source:"/r/:path*",headers:[{key:"Cache-Control",value:"private, no-store"},{key:"X-Robots-Tag",value:"noindex, nofollow, noarchive"}]},{source:"/api/:path*",headers:[{key:"Cache-Control",value:"no-store"}]}];}
};export default nextConfig;
