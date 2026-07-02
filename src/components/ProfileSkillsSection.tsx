import { Sparkles } from "lucide-react";

export interface ProfileSkill {
  id: string;
  name: string;
}

interface ProfileSkillsSectionProps {
  skills: ProfileSkill[];
  onEdit?: () => void;
  emptyHint?: string;
}

const ProfileSkillsSection = ({
  skills,
  onEdit,
  emptyHint = "Upload a CV in Edit Profile to fill skills automatically.",
}: ProfileSkillsSectionProps) => (
  <section className="mt-4 bg-background rounded-2xl px-5 py-5 card-shadow">
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-heading font-extrabold text-foreground text-[15px] flex items-center gap-2">
        <span className="text-primary">
          <Sparkles className="w-4 h-4" />
        </span>
        Skills
      </h2>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-bold text-primary hover:underline tracking-tag"
        >
          Edit
        </button>
      )}
    </div>
    {skills.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill.id}
            className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold"
          >
            {skill.name}
          </span>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">{emptyHint}</p>
    )}
  </section>
);

export default ProfileSkillsSection;
