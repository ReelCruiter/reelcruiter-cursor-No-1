import Layout from "@/components/Layout";
import UserAvatar from "@/components/UserAvatar";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2, Briefcase, MapPin, MessageSquare, ChevronRight } from "lucide-react";
import { fetchMyApplications, type MyApplication } from "@/lib/applications";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/time";

const statusStyles: Record<string, string> = {
  new: "bg-primary/10 text-primary",
  viewed: "bg-muted text-muted-foreground",
  shortlisted: "bg-emerald-500/15 text-emerald-600",
  rejected: "bg-destructive/10 text-destructive",
};
const statusLabel: Record<string, string> = {
  new: "Submitted",
  viewed: "Viewed",
  shortlisted: "Shortlisted",
  rejected: "Not selected",
};

const Applications = () => {
  const [items, setItems] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchMyApplications();
      setItems(data);
      setLoading(false);
    })();
  }, []);

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-7 h-7" /> My Applications
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            All the jobs you've applied to.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl card-shadow">
            <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No applications yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              When you tap “Apply Now” on a job, it'll show up here.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link to="/feed">Browse jobs</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((a) => (
              <li
                key={a.id}
                className="bg-card rounded-xl card-shadow p-4 flex items-start gap-3"
              >
                <Link to={`/user/${a.employerId}`} className="flex-shrink-0">
                  <UserAvatar
                    src={a.employerAvatar}
                    name={a.employerName}
                    className="w-12 h-12"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/post/${a.postId}`}
                        className="font-heading font-bold text-card-foreground hover:text-primary transition-colors block truncate"
                      >
                        {a.postTitle}
                      </Link>
                      <Link
                        to={`/user/${a.employerId}`}
                        className="text-xs text-muted-foreground hover:text-foreground truncate block"
                      >
                        {a.employerName}
                      </Link>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 flex-shrink-0 ${
                        statusStyles[a.status] || statusStyles.new
                      }`}
                    >
                      {statusLabel[a.status] || a.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                    {(a.city || a.country) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[a.city, a.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                    <span>Applied {formatRelativeTime(a.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button asChild size="sm" variant="secondary">
                      <Link to={`/post/${a.postId}`}>
                        View job <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </Button>
                    {a.employerId && (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/messages?to=${a.employerId}`}>
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Message
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
};

export default Applications;
