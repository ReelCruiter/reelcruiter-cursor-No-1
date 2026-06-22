import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Send } from "lucide-react";
import LegalLayout from "@/components/LegalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactInquiry } from "@/lib/contact";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      if (user.email) setEmail((current) => current || user.email!);
      const metaName = user.user_metadata?.full_name;
      if (typeof metaName === "string" && metaName) {
        setName((current) => current || metaName);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    const { error } = await submitContactInquiry({
      name,
      email,
      subject,
      message,
      website: honeypot,
    });
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    setSent(true);
    toast.success("Message sent. We will get back to you soon.");
    setSubject("");
    setMessage("");
  };

  return (
    <LegalLayout title="Contact us">
      <p>
        Questions about ReelCruiter? Send us a message below. We read every inquiry and reply as
        soon as we can.
      </p>

      {sent ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 space-y-3">
          <p className="font-semibold text-foreground">Thanks for reaching out.</p>
          <p className="text-sm">
            Your message was received. If you need help with your account, you can also use{" "}
            <Link to="/settings" className="text-primary font-semibold hover:underline">
              Contact support
            </Link>{" "}
            in Settings after signing in.
          </p>
          <Button type="button" variant="secondary" onClick={() => setSent(false)}>
            Send another message
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4 max-w-lg">
          <div className="hidden" aria-hidden>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-name">Your name</Label>
            <Input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              autoComplete="name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Your email</Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={200}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-subject">Subject</Label>
            <Input
              id="contact-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
              required
              placeholder="What is this about?"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-message">Message</Label>
            <Textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              required
              rows={5}
              placeholder="How can we help?"
            />
          </div>

          <Button type="submit" disabled={loading} className="rounded-full h-11 px-6 font-semibold">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send message
              </>
            )}
          </Button>
        </form>
      )}

      <p className="mt-10 text-sm">
        Already have an account?{" "}
        <Link to="/settings" className="text-primary font-semibold hover:underline">
          Contact support in Settings
        </Link>{" "}
        for profile or account help.
      </p>
    </LegalLayout>
  );
}
