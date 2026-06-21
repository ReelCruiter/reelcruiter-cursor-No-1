import AppSidebar from "./AppSidebar";
import Navbar from "./Navbar";

import PushInstallBanner from "./PushInstallBanner";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <PushInstallBanner />
        <main className="flex-1 lg:px-2">{children}</main>
        <div className="lg:hidden">
          <Navbar />
        </div>
      </div>
    </div>
  );
};

export default Layout;
