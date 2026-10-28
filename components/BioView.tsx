import type { LinkRow, Profile } from "@/lib/types";
import { hostOf, initials } from "@/lib/validate";

type Props = {
  profile: Pick<Profile, "name" | "username" | "headline" | "bio" | "theme" | "shape" | "fill">;
  links: LinkRow[];
  preview?: boolean;
};

function Item({ l, kind, preview }: { l: LinkRow; kind: "btn" | "social"; preview?: boolean }) {
  const href = preview ? "#" : `/api/go/${l.id}`;
  return (
    <a className={kind} href={href} target={preview ? undefined : "_blank"} rel="noopener noreferrer">
      <span>{l.title || "Untitled"}</span>
      {kind === "btn" && l.url ? <span className="dom">{hostOf(l.url)}</span> : null}
    </a>
  );
}

export function BioView({ profile, links, preview }: Props) {
  const shown = links.filter((l) => l.enabled);
  const socials = shown.filter((l) => l.kind === "social");
  const rest = shown.filter((l) => l.kind !== "social");
  return (
    <div className="bio" data-bio={profile.theme} data-shape={profile.shape} data-fill={profile.fill}>
      <div className="bio-in">
        <div className="avatar" aria-hidden="true">{initials(profile.name || profile.username)}</div>
        <h1 className="bio-name">{profile.name || profile.username || "Your name"}</h1>
        {profile.username ? <p className="bio-handle">@{profile.username}</p> : null}
        {profile.headline ? <p className="bio-head">{profile.headline}</p> : null}
        {profile.bio ? <p className="bio-text">{profile.bio}</p> : null}
        {socials.length ? (
          <div className="socials">
            {socials.map((l) => <Item key={l.id} l={l} kind="social" preview={preview} />)}
          </div>
        ) : null}
        {rest.length ? (
          <div className="stack">
            {rest.map((l) =>
              l.kind === "header" ? (
                <h2 key={l.id} className="sec">{l.title}</h2>
              ) : (
                <Item key={l.id} l={l} kind="btn" preview={preview} />
              ),
            )}
          </div>
        ) : (
          <p className="empty-bio">No links yet.</p>
        )}
      </div>
    </div>
  );
}
