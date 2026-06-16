import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import VideoPostCard from "@/components/VideoPostCard";
import { useProfileStore } from "@/lib/profileStore";
import { useSavedJobs } from "@/lib/savedJobs";

const SavedJobs = () => {
  const navigate = useNavigate();
  const posts = useProfileStore((s) => s.posts);
  const { savedIds, loading } = useSavedJobs();

  const savedPosts = posts.filter((p) => savedIds.has(p.id));

  return (
    <Layout>
      <div className="container max-w-3xl py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-heading font-bold flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            Saved Jobs
          </h1>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>
        ) : savedPosts.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl card-shadow">
            <Bookmark className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-heading font-bold text-card-foreground">No saved jobs yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tap the bookmark on any job post to save it for later.
            </p>
            <Button className="mt-4" onClick={() => navigate("/feed")}>
              Browse jobs
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {savedPosts.map((post) => (
              <VideoPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SavedJobs;
