import Layout from "@/components/Layout";
import VideoPostCard from "@/components/VideoPostCard";
import EmptyState from "@/components/EmptyState";
import { FeedSkeleton } from "@/components/skeletons/FeedSkeleton";
import { jobTypes, jobTypeLabels } from "@/lib/models";
import { isJobAcceptingApplications } from "@/lib/applications";
import { countries, getCitiesForCountry } from "@/lib/locations";
import { jobCategories } from "@/lib/categories";
import SearchableCombobox from "@/components/SearchableCombobox";
import { useProfileStore } from "@/lib/profileStore";
import { useState, useMemo, useEffect } from "react";
import { Search, SlidersHorizontal, X, MapPin, Briefcase, Tag, Users, Sparkles, Rss, UserSearch } from "lucide-react";
import { useUserMode } from "@/lib/userMode";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import LastActiveLabel from "@/components/LastActiveLabel";

interface SeekerProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  last_active_at: string | null;
}

const Feed = () => {
  const { mode, loading: modeLoading } = useUserMode();
  const isHiring = mode === "hiring";

  const allPosts = useProfileStore((s) => s.posts);
  const loadPostsFromDb = useProfileStore((s) => s.loadPostsFromDb);
  const myProfile = useProfileStore((s) => s.profile);
  const userId = useProfileStore((s) => s.userId);

  useEffect(() => {
    setPostsLoading(true);
    loadPostsFromDb().finally(() => setPostsLoading(false));
  }, [loadPostsFromDb, mode]);
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedJobType, setSelectedJobType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [seekers, setSeekers] = useState<SeekerProfile[]>([]);
  const [seekersLoading, setSeekersLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);
  // Top segment filter
  const [segment, setSegment] = useState<"all" | "jobs" | "open_to_work" | "community">("all");

  // Reset segment when role changes so we never end up with an invalid value.
  useEffect(() => {
    setSegment("all");
  }, [isHiring]);

  const hasActiveFilters = selectedCountry || selectedCity || selectedJobType || selectedCategory;

  // Load job seekers when in hiring mode
  useEffect(() => {
    if (!isHiring) return;
    let cancelled = false;
    (async () => {
      setSeekersLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, bio, location, active_mode")
        .eq("active_mode", "job_seeker")
        .order("updated_at", { ascending: false })
        .limit(60);
      if (cancelled) return;
      setSeekers((data ?? []) as SeekerProfile[]);
      setSeekersLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isHiring]);

  const filtered = useMemo(() => {
    // Always exclude hidden + the viewer's own posts (no self-duplication in feed).
    let posts = allPosts.filter((p) => !p.hiddenFromFeed && p.userId !== userId);

    // Hide filled or expired job listings from the public feed.
    posts = posts.filter((p) => {
      const isHiringJob = p.tag === "hiring" || p.postKind === "hiring";
      if (!isHiringJob) return true;
      return isJobAcceptingApplications({
        deadline: p.deadline ?? null,
        is_public: true,
        hidden_from_feed: p.hiddenFromFeed ?? false,
      });
    });

    // Role-based scoping. We infer post kind from postKind, falling back to tag.
    const kindOf = (p: VideoPost) =>
      p.postKind || (p.tag === "hiring" ? "hiring" : "community");

    if (isHiring) {
      // Employers — All Posts: Open to Work + Community. Open to Work: only seeker videos.
      posts = posts.filter((p) => {
        const k = kindOf(p);
        if (segment === "open_to_work") return k === "open_to_work";
        if (segment === "community") return k === "community";
        return k === "open_to_work" || k === "community";
      });
    } else {
      // Job seekers — All Posts: Jobs + Workplace + Community. Jobs Only: just job ads.
      posts = posts.filter((p) => {
        const k = kindOf(p);
        if (segment === "jobs") return k === "hiring";
        if (segment === "community") return k === "community";
        return k === "hiring" || k === "workplace" || k === "community";
      });
    }

    if (selectedCountry) posts = posts.filter((p) => p.location.country === selectedCountry);
    if (selectedCity) posts = posts.filter((p) => p.location.city === selectedCity);
    if (selectedJobType) {
      posts = posts.filter((p) =>
        String(p.jobType || "")
          .split(",")
          .map((t) => t.trim())
          .includes(selectedJobType)
      );
    }
    if (selectedCategory) posts = posts.filter((p) => p.category === selectedCategory);

    if (search.trim()) {
      const q = search.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.jobTitle.toLowerCase().includes(q) ||
          p.userName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.location.city.toLowerCase().includes(q) ||
          p.location.country.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // Priority sort: primary kind for the viewer first, then by recency.
    const priority = (p: VideoPost) => {
      const k = kindOf(p);
      if (isHiring) {
        if (k === "open_to_work") return 0;
        if (k === "hiring") return 1;
        return 2; // community
      }
      if (k === "hiring") return 0;
      return 1; // community
    };
    posts = [...posts].sort((a, b) => {
      const d = priority(a) - priority(b);
      if (d !== 0) return d;
      return a.daysAgo - b.daysAgo;
    });

    return posts;
  }, [allPosts, userId, isHiring, segment, search, selectedCountry, selectedCity, selectedJobType, selectedCategory]);

  // Recommended jobs for job seekers, based on profile city/country
  const recommended = useMemo(() => {
    if (isHiring) return [];
    const myCity = myProfile.city?.toLowerCase();
    const myCountry = myProfile.country?.toLowerCase();
    if (!myCity && !myCountry) return [];
    return filtered
      .filter((p) => {
        const c = p.location.city?.toLowerCase();
        const co = p.location.country?.toLowerCase();
        return (myCity && c === myCity) || (myCountry && co === myCountry);
      })
      .slice(0, 3);
  }, [filtered, myProfile.city, myProfile.country, isHiring]);

  const filteredSeekers = useMemo(() => {
    if (!isHiring) return [];
    if (!search.trim()) return seekers;
    const q = search.toLowerCase();
    return seekers.filter((s) =>
      (s.full_name || "").toLowerCase().includes(q) ||
      (s.bio || "").toLowerCase().includes(q) ||
      (s.location || "").toLowerCase().includes(q)
    );
  }, [seekers, search, isHiring]);

  const clearFilters = () => {
    setSelectedCountry("");
    setSelectedCity("");
    setSelectedJobType("");
    setSelectedCategory("");
    setSearch("");
  };

  const availableCities = selectedCountry ? getCitiesForCountry(selectedCountry) : [];

  return (
    <Layout>
      <div className="container py-8">
        {/* Sticky search + segment filters */}
        <div className="sticky top-0 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 mb-4">
        {/* Search bar (primary action) with inline filter button (mobile) */}
        <div className="relative mb-3">
          {isHiring ? (
            <UserSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          ) : (
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          )}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isHiring
                ? "Search job seeker profiles by name or location…"
                : "Search jobs, companies, location…"
            }
            className="w-full rounded-2xl border-2 border-border bg-muted/80 pl-11 pr-12 py-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 dark:bg-muted dark:border-border"
          />
          {search ? (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : !isHiring ? (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`sm:hidden absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                showFilters || hasActiveFilters
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
              aria-label="Toggle filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center font-bold border-2 border-background">
                  {[selectedCountry, selectedCity, selectedJobType, selectedCategory].filter(Boolean).length}
                </span>
              )}
            </button>
          ) : null}
        </div>

        {/* Segment filter bar — role-aware (directly below search) */}
        <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {(isHiring
            ? ([
                { id: "all", label: "All Posts" },
                { id: "open_to_work", label: "Open to Work" },
                { id: "community", label: "Community" },
              ] as const)
            : ([
                { id: "all", label: "All Posts" },
                { id: "jobs", label: "Jobs Only" },
                { id: "community", label: "Community" },
              ] as const)
          ).map((opt) => {
            const active = segment === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSegment(opt.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 border ${
                  active
                    ? "bg-primary text-primary-foreground border-primary chip-shadow"
                    : "bg-card text-foreground border-border hover:bg-muted"
                }`}
                aria-pressed={active}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        </div>

        {/* Filter button (job seeker mode only) */}
        {!isHiring && (
          <div className="flex items-center justify-end gap-2 mb-5">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`hidden sm:flex shrink-0 items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                showFilters || hasActiveFilters
                  ? "bg-primary text-primary-foreground chip-shadow"
                  : "bg-card text-foreground hover:bg-muted chip-shadow border border-border/60"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-5 h-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center font-bold">
                  {[selectedCountry, selectedCity, selectedJobType, selectedCategory].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Filter panel */}
        {!isHiring && showFilters && (
          <div className="bg-card rounded-xl p-5 card-shadow mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-card-foreground">Filter Results</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-primary hover:underline font-medium">
                  Clear all
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Country */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                  <MapPin className="w-3 h-3" /> Country
                </label>
                <SearchableCombobox
                  value={selectedCountry}
                  onChange={(v) => { setSelectedCountry(v); setSelectedCity(""); }}
                  options={countries}
                  placeholder="All countries"
                  searchPlaceholder="Search countries…"
                  emptyText="No country found."
                />
              </div>
              {/* City */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                  <MapPin className="w-3 h-3" /> City
                </label>
                <SearchableCombobox
                  value={selectedCity}
                  onChange={setSelectedCity}
                  options={availableCities}
                  placeholder="All cities"
                  searchPlaceholder="Search cities…"
                  emptyText="No city found."
                  disabled={!selectedCountry || availableCities.length === 0}
                />
              </div>
              {/* Job Type */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                  <Briefcase className="w-3 h-3" /> Job Type
                </label>
                <select
                  value={selectedJobType}
                  onChange={(e) => setSelectedJobType(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring h-10"
                >
                  <option value="">All types</option>
                  {jobTypes.map((t) => <option key={t} value={t}>{jobTypeLabels[t]}</option>)}
                </select>
              </div>
              {/* Category */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                  <Tag className="w-3 h-3" /> Category
                </label>
                <SearchableCombobox
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  options={jobCategories}
                  placeholder="All categories"
                  searchPlaceholder="Search categories…"
                  emptyText="No category found."
                />
              </div>
            </div>
          </div>
        )}

        {isHiring ? (
          <>
            {/* Employer feed: Open to Work first, then Hiring + Community */}
            <p className="text-xs text-muted-foreground mb-4">
              {filtered.length} post{filtered.length !== 1 ? "s" : ""}
            </p>
            {postsLoading ? (
              <FeedSkeleton />
            ) : (
              <>
            <div className="max-w-[640px] mx-auto flex flex-col gap-6">
              {filtered.map((post) => (
                <VideoPostCard key={post.id} post={post} />
              ))}
            </div>
            {filtered.length === 0 && (
              <EmptyState
                icon={Users}
                title="No posts yet"
                description="Candidates and recruiters will appear here as they share videos."
                actionLabel="Create a post"
                actionTo="/upload"
              />
            )}
              </>
            )}

            {/* Candidate directory */}
            <section className="mt-10 max-w-[640px] mx-auto">
              <h2 className="text-sm font-heading font-bold text-foreground mb-3 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" /> Candidates
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                {seekersLoading
                  ? "Loading candidates…"
                  : `${filteredSeekers.length} candidate${filteredSeekers.length !== 1 ? "s" : ""}`}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredSeekers.map((s) => (
                  <Link
                    key={s.user_id}
                    to={`/user/${s.user_id}`}
                    className="flex items-start gap-3 bg-card rounded-2xl p-4 card-shadow hover:shadow-md transition-shadow"
                  >
                    <UserAvatar src={s.avatar_url} name={s.full_name || "Member"} className="w-12 h-12 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-bold text-sm text-card-foreground truncate">
                        {s.full_name || "Member"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Job seeker profile</p>
                      {s.user_id !== userId && (
                        <LastActiveLabel at={s.last_active_at} className="mt-0.5" />
                      )}
                      {s.location && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {s.location}
                        </p>
                      )}
                      {s.bio && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.bio}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              {!seekersLoading && filteredSeekers.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">No candidates yet.</p>
              )}
            </section>
          </>
        ) : (
          <>
            {/* Recommended for you */}
            {recommended.length > 0 && (
              <section className="mb-6 max-w-[640px] mx-auto">
                <h2 className="text-sm font-heading font-bold text-foreground mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" /> Recommended for you
                </h2>
                <div className="flex flex-col gap-4">
                  {recommended.map((post) => (
                    <VideoPostCard key={`rec-${post.id}`} post={post} />
                  ))}
                </div>
              </section>
            )}

            <p className="text-xs text-muted-foreground mb-4">
              {filtered.length} job{filtered.length !== 1 ? "s" : ""} found
            </p>

            {postsLoading ? (
              <FeedSkeleton />
            ) : (
              <>
            <div className="max-w-[640px] mx-auto flex flex-col gap-6">
              {filtered.map((post) => (
                <VideoPostCard key={post.id} post={post} />
              ))}
            </div>

            {filtered.length === 0 && (
              <EmptyState
                icon={hasActiveFilters || search ? Search : Rss}
                title={hasActiveFilters || search ? "No jobs found" : "No jobs posted yet"}
                description={
                  hasActiveFilters || search
                    ? "Try adjusting your filters or search terms."
                    : "Be the first to explore. Check back soon or widen your search."
                }
                {...(hasActiveFilters || search
                  ? { actionLabel: "Clear filters", onAction: clearFilters }
                  : {})}
              />
            )}
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Feed;
