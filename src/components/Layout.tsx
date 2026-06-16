import AppSidebar from "./AppSidebar";
import Navbar from "./Navbar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <main className="flex-1 lg:px-2">{children}</main>
        <div className="lg:hidden">
          <Navbar />
        </div>
      </div>
    </div>
  );
};

export default Layout;
