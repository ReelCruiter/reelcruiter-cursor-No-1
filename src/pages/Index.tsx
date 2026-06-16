import { Navigate } from "react-router-dom";

/** Legacy redirect — landing page is now at `/` */
const Index = () => <Navigate to="/" replace />;

export default Index;
